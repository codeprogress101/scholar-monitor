using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

// The non-inheritable job handle belongs only to the supervisor. Windows closes
// it even when Task Scheduler terminates PowerShell, killing every owned child.
public sealed class LdssProcessJob : IDisposable {
    private IntPtr job;
    [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong a,b,c,d,e,f; }
    [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMITS {
        public long ProcessTime, JobTime; public uint Flags;
        public UIntPtr MinWorkingSet, MaxWorkingSet; public uint ActiveProcesses;
        public UIntPtr Affinity; public uint Priority, Scheduling;
    }
    [StructLayout(LayoutKind.Sequential)] struct EXTENDED_LIMITS {
        public BASIC_LIMITS Basic; public IO_COUNTERS IO;
        public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
    }
    [StructLayout(LayoutKind.Sequential)] struct SECURITY_ATTRIBUTES {
        public int Length; public IntPtr Descriptor;
        [MarshalAs(UnmanagedType.Bool)] public bool Inherit;
    }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUPINFO {
        public int cb; public string reserved, desktop, title;
        public uint x,y,xSize,ySize,xChars,yChars,fill,flags;
        public ushort show,reservedSize; public IntPtr reservedBytes,input,output,error;
    }
    [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION {
        public IntPtr process, thread; public uint processId, threadId;
    }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attr,string name);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int kind,ref EXTENDED_LIMITS info,uint size);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref STARTUPINFO startup,out PROCESS_INFORMATION pi);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateFile(string file,uint access,uint share,ref SECURITY_ATTRIBUTES attr,uint creation,uint flags,IntPtr template);
    [DllImport("kernel32.dll", SetLastError=true)] internal static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", SetLastError=true)] internal static extern bool TerminateProcess(IntPtr process,uint code);
    [DllImport("kernel32.dll", SetLastError=true)] internal static extern uint WaitForSingleObject(IntPtr handle,uint ms);
    [DllImport("kernel32.dll", SetLastError=true)] internal static extern bool GetExitCodeProcess(IntPtr handle,out uint code);
    static void Check(bool ok) { if(!ok) throw new Win32Exception(Marshal.GetLastWin32Error()); }
    public LdssProcessJob() {
        job=CreateJobObject(IntPtr.Zero,null); Check(job!=IntPtr.Zero);
        var limits=new EXTENDED_LIMITS(); limits.Basic.Flags=0x2000; // KILL_ON_JOB_CLOSE
        if(!SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf(limits))) {
            int error=Marshal.GetLastWin32Error(); CloseHandle(job); job=IntPtr.Zero; throw new Win32Exception(error);
        }
    }
    public LdssOwnedChild Start(string executable,string arguments,string cwd,string stdout,string stderr) {
        var sa=new SECURITY_ATTRIBUTES {Length=Marshal.SizeOf(typeof(SECURITY_ATTRIBUTES)),Inherit=true};
        IntPtr input=IntPtr.Zero,output=IntPtr.Zero,error=IntPtr.Zero;
        var pi=new PROCESS_INFORMATION(); bool created=false;
        try {
            input=CreateFile("NUL",0x80000000,3,ref sa,3,0,IntPtr.Zero);
            output=CreateFile(stdout,4,3,ref sa,4,0,IntPtr.Zero); // FILE_APPEND_DATA
            error=CreateFile(stderr,4,3,ref sa,4,0,IntPtr.Zero);
            Check(input!=new IntPtr(-1) && output!=new IntPtr(-1) && error!=new IntPtr(-1));
            var si=new STARTUPINFO {cb=Marshal.SizeOf(typeof(STARTUPINFO)),flags=0x100,input=input,output=output,error=error};
            Check(CreateProcess(executable,new StringBuilder("\""+executable+"\" "+arguments),IntPtr.Zero,IntPtr.Zero,true,0x08000004,IntPtr.Zero,cwd,ref si,out pi));
            created=true; // Suspended until ownership is secured: no orphan race.
            Check(AssignProcessToJobObject(job,pi.process));
            Check(ResumeThread(pi.thread)!=0xffffffff);
            return new LdssOwnedChild(pi.process,pi.processId);
        } catch {
            if(created) { TerminateProcess(pi.process,1); WaitForSingleObject(pi.process,5000); CloseHandle(pi.process); }
            throw;
        } finally {
            if(pi.thread!=IntPtr.Zero)CloseHandle(pi.thread);
            foreach(var h in new[]{input,output,error}) if(h!=IntPtr.Zero && h!=new IntPtr(-1))CloseHandle(h);
        }
    }
    public void Dispose() { if(job!=IntPtr.Zero) {CloseHandle(job);job=IntPtr.Zero;} }
}
public sealed class LdssOwnedChild : IDisposable {
    private IntPtr process; public uint Id {get;private set;}
    internal LdssOwnedChild(IntPtr handle,uint id) {process=handle;Id=id;}
    public bool Wait(int milliseconds) {var result=LdssProcessJob.WaitForSingleObject(process,(uint)milliseconds);if(result==0xffffffff)throw new Win32Exception(Marshal.GetLastWin32Error());return result==0;}
    public uint ExitCode {get {uint code;if(!LdssProcessJob.GetExitCodeProcess(process,out code))throw new Win32Exception(Marshal.GetLastWin32Error());return code;}}
    public void Stop() {if(!Wait(0)){LdssProcessJob.TerminateProcess(process,1);Wait(5000);}}
    public void Dispose() {if(process!=IntPtr.Zero){LdssProcessJob.CloseHandle(process);process=IntPtr.Zero;}}
}

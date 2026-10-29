// Operator-only Windows primitives. No listener, SQL interface, process launcher or backup writer.
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security;
using System.Security.Principal;
using Microsoft.Win32.SafeHandles;

namespace LdssBackupFoundation {
  public static class Native {
    [StructLayout(LayoutKind.Sequential)] struct SecurityAttributes { public int Length; public IntPtr Descriptor; public int Inherit; }
    [StructLayout(LayoutKind.Sequential)] struct LsaAttributes { public int Length; public IntPtr RootDirectory; public IntPtr ObjectName; public uint Attributes; public IntPtr SecurityDescriptor; public IntPtr SecurityQualityOfService; }
    [StructLayout(LayoutKind.Sequential)] struct LsaString { public ushort Length; public ushort MaximumLength; public IntPtr Buffer; }
    [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool ConvertStringSecurityDescriptorToSecurityDescriptor(string text,uint revision,out IntPtr descriptor,out uint size);
    [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr value);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateDirectory(string path,ref SecurityAttributes security);
    [DllImport("advapi32.dll", CharSet=CharSet.Unicode)] static extern int RegCreateKeyEx(IntPtr key,string subkey,int reserved,string cls,int options,int access,ref SecurityAttributes security,out IntPtr result,out int disposition);
    [DllImport("advapi32.dll")] static extern int RegCloseKey(IntPtr key);
    [DllImport("advapi32.dll", CharSet=CharSet.Unicode)] static extern int RegOpenKeyEx(IntPtr root,string subkey,uint options,int access,out IntPtr key);
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,int id);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("advapi32.dll", SetLastError=true)] static extern bool OpenProcessToken(IntPtr process,uint access,out SafeAccessTokenHandle token);
    [DllImport("advapi32.dll", SetLastError=true)] static extern bool GetTokenInformation(SafeAccessTokenHandle token,int kind,out int value,int length,out int needed);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern SafeFileHandle CreateFile(string path,uint access,uint sharing,IntPtr security,uint disposition,uint flags,IntPtr template);
    [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool LogonUser(string user,string domain,IntPtr password,int kind,int provider,out SafeAccessTokenHandle token);
    [DllImport("advapi32.dll")] static extern uint LsaOpenPolicy(IntPtr system,ref LsaAttributes attrs,uint access,out IntPtr policy);
    [DllImport("advapi32.dll")] static extern uint LsaAddAccountRights(IntPtr policy,IntPtr sid,LsaString[] rights,uint count);
    [DllImport("advapi32.dll")] static extern uint LsaRemoveAccountRights(IntPtr policy,IntPtr sid,bool all,LsaString[] rights,uint count);
    [DllImport("advapi32.dll")] static extern uint LsaEnumerateAccountRights(IntPtr policy,IntPtr sid,out IntPtr rights,out uint count);
    [DllImport("advapi32.dll")] static extern uint LsaNtStatusToWinError(uint status);
    [DllImport("advapi32.dll")] static extern uint LsaFreeMemory(IntPtr memory);
    [DllImport("advapi32.dll")] static extern uint LsaClose(IntPtr policy);
    static void LsaCheck(uint status) { if(status!=0)throw new Win32Exception((int)LsaNtStatusToWinError(status)); }
    static IntPtr Descriptor(string text) { IntPtr value;uint size;if(!ConvertStringSecurityDescriptorToSecurityDescriptor(text,1,out value,out size))throw new Win32Exception(Marshal.GetLastWin32Error());return value; }
    public static void CreateDirectoryExclusive(string path,string sddl) {
      IntPtr descriptor=Descriptor(sddl);try { var security=new SecurityAttributes{Length=Marshal.SizeOf(typeof(SecurityAttributes)),Descriptor=descriptor};if(!CreateDirectory(path,ref security))throw new Win32Exception(Marshal.GetLastWin32Error()); }finally{LocalFree(descriptor);}
    }
    public static void CreateRegistryExclusive(string subkey,string sddl) {
      IntPtr descriptor=Descriptor(sddl),key=IntPtr.Zero;try {var security=new SecurityAttributes{Length=Marshal.SizeOf(typeof(SecurityAttributes)),Descriptor=descriptor};int disposition;int error=RegCreateKeyEx(new IntPtr(unchecked((int)0x80000002)),subkey,0,null,0,0x2001f,ref security,out key,out disposition);if(error!=0)throw new Win32Exception(error);if(disposition!=1)throw new InvalidOperationException("Registry ownership key already exists; no adoption allowed.");}finally{if(key!=IntPtr.Zero)RegCloseKey(key);LocalFree(descriptor);}
    }
    public static SafeAccessTokenHandle ProcessToken(int id) {
      IntPtr process=OpenProcess(0x1000,false,id);if(process==IntPtr.Zero)throw new Win32Exception(Marshal.GetLastWin32Error());try {SafeAccessTokenHandle token;if(!OpenProcessToken(process,0x0e,out token))throw new Win32Exception(Marshal.GetLastWin32Error());return token;}finally{CloseHandle(process);}
    }
    public static string UserSid(SafeAccessTokenHandle token) {using(var identity=new WindowsIdentity(token.DangerousGetHandle()))return identity.User.Value;}
    public static bool Elevated(SafeAccessTokenHandle token) {int value,needed;if(!GetTokenInformation(token,20,out value,4,out needed))throw new Win32Exception(Marshal.GetLastWin32Error());return value!=0;}
    public static bool Administrator(SafeAccessTokenHandle token) {using(var identity=new WindowsIdentity(token.DangerousGetHandle()))return new WindowsPrincipal(identity).IsInRole(WindowsBuiltInRole.Administrator);}
    public static int Probe(SafeAccessTokenHandle token,string path,uint access) {
      int result=-1;WindowsIdentity.RunImpersonated(token,()=>{using(var file=CreateFile(path,access,7,IntPtr.Zero,3,0x02000000,IntPtr.Zero)){result=file.IsInvalid?Marshal.GetLastWin32Error():0;}});return result;
    }
    public static int ProbeRegistry(SafeAccessTokenHandle token,string subkey,int access) {
      int result=-1;WindowsIdentity.RunImpersonated(token,()=>{IntPtr key;result=RegOpenKeyEx(new IntPtr(unchecked((int)0x80000002)),subkey,0,access,out key);if(key!=IntPtr.Zero)RegCloseKey(key);});return result;
    }
    public static SafeAccessTokenHandle ServiceToken(string user,SecureString password) {
      IntPtr clear=Marshal.SecureStringToGlobalAllocUnicode(password);try{SafeAccessTokenHandle token;if(!LogonUser(user,Environment.MachineName,clear,5,0,out token))throw new Win32Exception(Marshal.GetLastWin32Error());return token;}finally{Marshal.ZeroFreeGlobalAllocUnicode(clear);}
    }
    static IntPtr Sid(string text) {var sid=new SecurityIdentifier(text);var bytes=new byte[sid.BinaryLength];sid.GetBinaryForm(bytes,0);var value=Marshal.AllocHGlobal(bytes.Length);Marshal.Copy(bytes,0,value,bytes.Length);return value;}
    static IntPtr Policy() {var attrs=new LsaAttributes{Length=Marshal.SizeOf(typeof(LsaAttributes))};IntPtr policy;LsaCheck(LsaOpenPolicy(IntPtr.Zero,ref attrs,0x811,out policy));return policy;}
    public static string[] Rights(string text) {
      IntPtr policy=Policy(),sid=Sid(text),memory=IntPtr.Zero;try{uint count;uint status=LsaEnumerateAccountRights(policy,sid,out memory,out count);if(status==0xc0000034)return new string[0];LsaCheck(status);var values=new List<string>();int size=Marshal.SizeOf(typeof(LsaString));for(int i=0;i<count;i++){var value=(LsaString)Marshal.PtrToStructure(IntPtr.Add(memory,i*size),typeof(LsaString));values.Add(Marshal.PtrToStringUni(value.Buffer,value.Length/2));}return values.ToArray();}finally{if(memory!=IntPtr.Zero)LsaFreeMemory(memory);Marshal.FreeHGlobal(sid);LsaClose(policy);}
    }
    public static void SetRights(string text,string[] names,bool add) {
      IntPtr policy=Policy(),sid=Sid(text);var strings=new LsaString[names.Length];try{for(int i=0;i<names.Length;i++){strings[i].Buffer=Marshal.StringToHGlobalUni(names[i]);strings[i].Length=checked((ushort)(names[i].Length*2));strings[i].MaximumLength=checked((ushort)(strings[i].Length+2));}LsaCheck(add?LsaAddAccountRights(policy,sid,strings,(uint)strings.Length):LsaRemoveAccountRights(policy,sid,false,strings,(uint)strings.Length));}finally{foreach(var value in strings)if(value.Buffer!=IntPtr.Zero)Marshal.FreeHGlobal(value.Buffer);Marshal.FreeHGlobal(sid);LsaClose(policy);}
    }
  }
}

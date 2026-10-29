import {LogOut,Menu,UserRound} from 'lucide-react';
import {NotificationBell,useNotificationCount} from './Notifications';
import type {Access} from '../server/authorization/policy';
import type {Session} from './auth-api';

export function SidebarAccount({session,access,onLogout,signingOut}:{session:Session;access:Access|null;onLogout:()=>void;signingOut:boolean}) {
 return <div className="sidebar-account" role="group" aria-label="Signed-in account">
  <span className="sidebar-account-avatar" aria-hidden="true"><UserRound size={18}/></span>
  <div className="sidebar-account-identity">
   <span className="sidebar-account-name">{session.user.fullName}</span>
   {access&&<span className="sidebar-account-role">{access.roles.map(role=>role.label).join(' · ')||'No role assigned'}</span>}
   {signingOut&&<span className="sidebar-account-role" role="status">Signing out...</span>}
  </div>
  <button className="sign-out-button" title="Sign out" aria-label="Sign out" onClick={onLogout} disabled={signingOut}><LogOut size={18} aria-hidden="true"/></button>
 </div>;
}

export default function WorkspaceControls({notificationCount,menuOpen,onOpenNavigation}:{notificationCount:ReturnType<typeof useNotificationCount>;menuOpen:boolean;onOpenNavigation:()=>void}) {
 return <div className="workspace-controls" role="group" aria-label="Workspace controls">
  <button className="mobile-toggle icon-button" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={onOpenNavigation}><Menu size={23}/></button>
  <div className="workspace-notifications"><NotificationBell feed={notificationCount}/></div>
 </div>;
}

import {Routes} from '@angular/router'
import {About} from './about/about'
import {MemberPickerSample} from './member-picker'
import {RepoBrowser} from './github/repo-browser/repo-browser'
import {RepoList} from './github/repo-list/repo-list'
import {RepoDetail} from './github/repo-detail/repo-detail'

export const rootRouterConfig: Routes = [
  {path: '', redirectTo: 'member-picker', terminal: true},
  {path: 'member-picker', component: MemberPickerSample},
  {path: 'about', component: About}
]


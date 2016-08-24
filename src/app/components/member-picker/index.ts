import { Component, Input, ViewChild, Output, ViewEncapsulation, EventEmitter } from '@angular/core'
import { MenuListComponent } from '../menu-list'
import { findIndex } from 'lodash'

@Component({
  selector: 'tb-member-picker',
  templateUrl: './member-picker.html',
  styleUrls:['./member-picker.css'],
  directives: [MenuListComponent],
  encapsulation:ViewEncapsulation.Native
})
export class MemberPickerComponent {
  @Input() items: any[] = []
  @Output() onSelect: EventEmitter<any> = new EventEmitter<any>()
  @Output() onRemove: EventEmitter<any> = new EventEmitter<any>()
  @ViewChild(MenuListComponent) menuList : MenuListComponent
  @ViewChild('input') input

  public activeClass: string = 'is-active'
  private selected: any[] = []

  filter(item, qs): boolean {
    return item.name.indexOf(qs) > -1
  }

  isSelected(item){
    return findIndex(this.selected, i => i === item) > -1
  }



  toggle(item){
    const index = findIndex(this.selected, i => i === item)
    if(index === -1){
      this.selected.push(item)
      this.onSelect.emit(item)
    } else {
      let removedItem = this.selected.splice(index, 1)
      this.onRemove.emit(removedItem)
    }
  }

  onEnter(item): void {
    this.toggle(item)
  }
}
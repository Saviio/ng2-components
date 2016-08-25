import { Component, Input, ViewChild, Output, EventEmitter } from '@angular/core'
import { MenuListComponent } from '../menu-list'

@Component({
  selector: 'tb-member-picker',
  templateUrl: './member-picker.html',
  styleUrls: [ './member-picker.css' ],
  directives: [ MenuListComponent ]
})
export class MemberPickerComponent {

  @Input() items: any[] = []
  @Output() onSelect: EventEmitter<any> = new EventEmitter<any>()
  @Output() onRemove: EventEmitter<any> = new EventEmitter<any>()
  @ViewChild(MenuListComponent) menuList: MenuListComponent

  public activeClass: string = 'is-active'
  private selected: Set<any> = new Set<any>()

  public member: string = ''
  public validator: RegExp = /^\w{0,5}$/

  public isValid(item) {
    return this.validator.test(item)
  }

  filter(item, qs): boolean {
    return item.name.indexOf(qs) > -1
  }

  isSelected(item) {
    return this.selected.has(item)
  }

  toggle(item) {
    if (!this.isSelected(item)) {
      this.selected.add(item)
      this.onSelect.emit(item)
    } else {
      this.selected.delete(item)
      this.onRemove.emit(item)
    }
  }

  onEnter(item):void {
    console.log(item)
    this.toggle(item)
  }

  onInputSubmit(item):void {
    console.log(item)
    this.menuList.reset()
  }
}

import {
  Input,
  Output,
  OnInit,
  Component,
  ViewChild,
  ElementRef,
  TemplateRef,
  ContentChild,
  EventEmitter,
  SimpleChange
} from '@angular/core'

import { findIndex } from 'lodash'
import { Subject } from 'rxjs/Subject'
import { Observable } from 'rxjs/Observable'
import { ScrollDirective } from '../../directives/scroll'


import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/publishReplay'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/startWith'
import 'rxjs/add/operator/debounceTime'

enum KeyboardOperation {
  Enter = 13,
  Up = 38,
  Down = 40
}

enum Action {
  Reset,
  Filter,
  Enter,
  MoveUp,
  MoveDown
}

const reCharacter = /^$|^([a-zA-Z0-9\u4e00-\u9fa5_ -]+)$/

@Component({
  selector: 'tb-menu-list',
  styleUrls: [ './tb-menu-list.css' ],
  templateUrl: './tb-menu-list.template.html',
  directives: [ ScrollDirective ]
})
export class MenuListComponent implements OnInit {

  @Input() items: any[] = []
  @Input() inputElem: any
  @Input() predicate = (v: any, qs?: String) => true
  @Input() initialQuery: string
  @Input() highlight: string = ''
  @Output() enter: EventEmitter<any> = new EventEmitter<any>()

  @ViewChild(ScrollDirective) scroll: ScrollDirective
  @ContentChild(TemplateRef) template: any

  private currIndex: number = -1
  private keyboardSubscription: any
  private inputSubscription: any
  private action$ : Subject<any> = new Subject<any>()
  private state$: Observable<any>

  ngOnInit() {
    this.keyboardSubscription = Observable.fromEvent(document, 'keyup')
      .do((event:KeyboardEvent) => event.stopPropagation())
      .map((event:KeyboardEvent) => event.keyCode)
      .do(keyCode => {
        switch (keyCode) {
          case KeyboardOperation.Enter:
            console.log('ENTER')
            this.submit()
            break
          case KeyboardOperation.Up:
            console.log('UP', this.currIndex)
            this.moveUp()
            break
          case KeyboardOperation.Down:
            console.log('DOWN', this.currIndex)
            this.moveDown()
            break
          default:
            break
        }
      })
      .subscribe()

      this.inputSubscription = Observable.fromEvent(<HTMLInputElement>this.inputElem, 'input')
        .filter((event: KeyboardEvent) => reCharacter.test((<HTMLInputElement>event.target).value))
        .map((event: KeyboardEvent) => (<HTMLInputElement>event.target).value)
        .debounceTime(100)
        .do(value => {
          let action =
            value === ''
            ? { type:Action.Reset, payload: this.items }
            : { type:Action.Filter, payload: value }

          this.action$.next(action)
        })
        .subscribe()

      /*console.log(this.ul.nativeElement)
      Observable.fromEvent(this.ul.nativeElement.firstChild, 'keyup')
        .do((event: KeyboardEvent) => {
          console.log(1)
          switch(event.keyCode){
            case Action.MoveUp:
            case Action.MoveDown:
              event.preventDefault()
              event.stopPropagation()
              break
          }
        })
        .subscribe()*/


      this.state$ = this.action$
        .startWith(this.items)
        .scan((prevState, action) => {
          let nextState = this.reducer(prevState, action)
          this.sideEffect(prevState, nextState, action)
          return nextState
        })
        .publishReplay(1)
        .refCount()

      /*
        options state ::=
              高亮状态 这个用Scroll Directive 通过DOM操作来完成？
              鼠标悬浮 (由外部控制）
              选中状态 (由外部控制)
      */

      if(this.initialQuery !== undefined){
        setTimeout(() => 
          this.action$.next({ type:Action.Filter, payload: this.initialQuery })
        , 0)
      }
  }

  ngOnDestory() {
    this.keyboardSubscription.unsubscribe()
    this.inputSubscription.unsubscribe()
  }

  ngOnChanges(changes) {
    if(changes.items && changes.items.currentValue !== changes.items.previousValue) {
      this.action$.next({ type: Action.Reset, payload: changes.items.currentValue })
    }
  }

  moveUp() {
    this.action$.next({ type: Action.MoveUp })
  }

  moveDown() {
    this.action$.next({ type: Action.MoveDown })
  }

  submit() { //考虑Input enter事件的第二种情况？ 以及Input不存在时的情况
    this.action$.next({ type: Action.Enter, payload: this.currIndex })
  }

  reducer(state, { type, payload }) {
    switch(type){
      case Action.Reset:
        return payload
      case Action.Filter:
        return this.items.filter(item => this.predicate(item, payload))
      default:
        return state
    }
  }

  sideEffect(prevState, currState, { type, payload }) {
    switch(type) {
      case Action.Enter:
        this.enter.emit(currState[payload])
        setTimeout(() =>
          this.action$.next({ type: Action.Reset, payload: this.items })
        , 0)
        return
      case Action.Reset:
        this.currIndex = -1
        this.scroll.scrollToTop()
        this.scroll.clearHighlight()
        if (this.inputElem) {
          this.inputElem.value = ''
        }
        return
      case Action.Filter:
        let newIndex: number = -1
        if (this.currIndex !== -1) {
          let item = prevState[this.currIndex]
          newIndex = findIndex(currState, i => i === item)
        }
        this.currIndex = newIndex
        this.scroll.scrollToIndex(newIndex)
        return
      case Action.MoveDown:
        if (!currState.length) {
          return
        }
        if (this.currIndex !== currState.length - 1) {
          this.currIndex += 1
        } else {
          this.currIndex = 0
        }
        break
      case Action.MoveUp:
        if (!currState.length) {
          return
        }
        if (this.currIndex > 0) {
          this.currIndex -= 1
        } else {
          this.currIndex = currState.length - 1
        }
        break
    }

    if (this.scroll) {
      this.scroll.scrollToIndex(this.currIndex)
    }
  }
}

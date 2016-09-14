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
  Up = 38,
  Down = 40,
  Enter = 13
}

enum Action {
  Reset,
  Filter,
  Enter,
  MoveUp,
  MoveDown,
  InputSubmit
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
  @Input() inputElem: HTMLInputElement
  @Input() predicate = (item: any, qs?: String) => true
  @Input() initialQuery: string
  @Input() highlight: string = ''
  @Input() autoMatch: boolean = true
  @Output() enter: EventEmitter<any> = new EventEmitter<any>()
  @Output() inputSubmit: EventEmitter<any> = new EventEmitter<any>()

  @ViewChild(ScrollDirective) scroll: ScrollDirective
  @ContentChild(TemplateRef) template: any

  private currIndex: number = -1
  private keyboardSubscription: any
  private inputSubscription: any
  private action$ : Subject<any> = new Subject<any>()
  private state$: Observable<any>

  ngOnInit() {
    this.keyboardSubscription = Observable.fromEvent(document, 'keydown')
      .do((event:KeyboardEvent) => event.preventDefault())
      .map((event:KeyboardEvent) => event.keyCode)
      .do(keyCode => {
        switch (keyCode) {
          case KeyboardOperation.Enter:
            this.submit()
            break
          case KeyboardOperation.Up:
            this.moveUp()
            break
          case KeyboardOperation.Down:
            this.moveDown()
            break
          default:
            break
        }
      })
      .subscribe()

      this.inputSubscription = Observable.fromEvent(this.inputElem, 'input')
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
      
      let initialState = this.items
      
      if(this.initialQuery !== undefined && this.initialQuery !== '') {
        let act = { type:Action.Filter, payload: this.initialQuery }
        initialState = this.reducer(initialState, act)
        this.sideEffect(this.items, initialState, act)
      }

      this.state$ = this.action$
        .startWith(initialState)
        .scan((prevState, action) => {
          let nextState = this.reducer(prevState, action)
          this.sideEffect(prevState, nextState, action)
          return nextState
        })
        .publishReplay(1)
        .refCount()
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

  submit() {
    if(this.currIndex === -1) { // 列表选项中不存在任何匹配的项，即：currIndex = -1 的情况下，则界定为响应input submit事件
      if(!this.inputElem) {
        throw new Error(`There's no HTMLInputElement was binded.`)
      }
      this.action$.next({ type: Action.InputSubmit, payload: this.inputElem.value.trim() })
    } else {
      this.action$.next({ type: Action.Enter, payload: this.currIndex })
    }
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
        this.reset()
        return 
      case Action.InputSubmit:
        this.inputSubmit.emit(payload)
        return
      case Action.Reset:
        this.currIndex = -1
        this.scroll.scrollToTop()
        this.scroll.clearHighlight()
        if (this.inputElem) {
          this.inputElem.value = ''
          let event = new Event('input', { bubbles:true, cancelable:false })
          this.inputElem.dispatchEvent(event)
        }
        return
      case Action.Filter:
        let newIndex: number = -1
        if (this.currIndex !== -1) {
          let item = prevState[this.currIndex]
          newIndex = findIndex(currState, i => i === item)
        }
        if(this.autoMatch) {
          this.currIndex = (currState.length >= 1 && newIndex === -1) ? 0 : newIndex
        } else {
          this.currIndex = newIndex
        }
        setTimeout(() => //等待Angular 完成DOM的变更
          this.scroll.scrollToIndex(this.currIndex)
        , 0)
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
      default:
        return
    }

    if (this.scroll) {
      this.scroll.scrollToIndex(this.currIndex)
    }
  }

  reset() {
    setTimeout(() =>
      this.action$.next({ type: Action.Reset, payload: this.items })
    , 0)
  }
}

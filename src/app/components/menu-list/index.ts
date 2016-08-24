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
import { ScrollDirective } from '../../directives/scroll'
import { Observable }    from 'rxjs/Observable'
import { Subject }    from 'rxjs/Subject'
import { findIndex } from 'lodash'

import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/publishReplay'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/startWith'
import 'rxjs/add/operator/debounceTime'


enum KeyboardOperation{
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

export interface MenuInterface {
  moveUp: () => void
  moveDown: () => void
  submit: () => void
}

@Component({
    selector: 'tb-menu-list',
    template: `
      <ul scroll [highlight]="highlight" #ul>
          <template 
            ngFor 
            [ngForOf]="state$ | async" 
            [ngForTemplate]="template" 
            let-i="index" 
            [ngForTrackBy]="i">
          </template>
      </ul>
    `,
    directives: [ScrollDirective],
    styleUrls:['./menu-list.css']
})
export class MenuListComponent implements OnInit, MenuInterface{
    private currIndex: number = -1
    private keyboardSubscription: any
    private inputSubscription: any
    private action$ : Subject<any> = new Subject<any>()
    private state$: Observable<any>
    
    @Input() private items: any[] = []
    @Input() private inputElem: any
    @Input() private predicate = (v: any, qs?: String) => true
    @Input() private initialQuery: string
    @Input() private highlight: string = ''
    @Output() enter: EventEmitter<any> = new EventEmitter<any>()

    @ViewChild(ScrollDirective) private scroll: ScrollDirective
    @ContentChild(TemplateRef) private template: any


    ngOnInit() {
      this.keyboardSubscription = 
        Observable.fromEvent(document, 'keyup')
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


        this.inputSubscription = 
          Observable.fromEvent(<HTMLInputElement>this.inputElem, 'input')
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
                    

        this.state$ = 
          this.action$
              .startWith(this.items)
              .scan((prevState, action) => {
                let nextState = this.reducer(prevState, action)
                this.sideEffect(prevState, nextState, action)
                return nextState
              })
              .publishReplay(1)
              .refCount()
              
        /*
        console.log(this.initialQuery)

        if(this.initialQuery !== undefined){
          this.action$.next({ type:Action.Filter, payload: this.initialQuery }) // not worked
        }
        */
        

        /*
          options state ::=
                高亮状态 这个用Scroll Directive 通过DOM操作来完成？
                鼠标悬浮 (由外部控制）
                选中状态 (由外部控制)

          考虑下没有Input的case？
        */
    }

    ngOnDestory(){
      this.keyboardSubscription.unsubscribe()
      this.inputSubscription.unsubscribe()
    }

    
    ngOnChanges(changes: {[propName: string]: SimpleChange}){
      for (let prop in changes) {
        if(prop === 'items'){
          this.action$.next({ type: Action.Reset, payload: changes[prop].currentValue })
        }
      }
    }
    
    moveUp(): void {
      this.action$.next({ type: Action.MoveUp })
    }

    moveDown(): void {
      this.action$.next({ type: Action.MoveDown })
    }

    submit(): void {
      this.action$.next({ type: Action.Enter, payload: this.currIndex})
    }

    protected reducer(state, { type, payload }): any {
      switch(type){
        case Action.Reset:
          return payload
        case Action.Filter:
          return this.items.filter(item => this.predicate(item, payload))
        default:
          return state
      }
    }

    protected sideEffect(prevState, nextState, { type, payload }) : void {
      switch(type) {
        case Action.Enter:
          this.enter.emit(nextState[payload])
          setTimeout(() => 
            this.action$.next({ type:Action.Reset, payload: this.items }) //is there any other solution?
          , 0)
          return
        case Action.Reset:
          this.currIndex = -1
          this.scroll.scrollToTop()
          this.scroll.clearHighlight()
          if(this.inputElem) {
            this.inputElem.value = ''
          }
          return
        case Action.Filter: 
          let newIndex: number = -1
          if(this.currIndex !== -1){
            let item = prevState[this.currIndex]
            newIndex = findIndex(nextState, i => i === item)
          }
          this.currIndex = newIndex
          this.scroll.scrollToIndex(newIndex)
          return
        case Action.MoveDown:
          if(!nextState) { 
            return 
          }        
          if(this.currIndex !== nextState.length - 1){
            this.currIndex += 1
          } else {
            this.currIndex = 0
          }
          break
        case Action.MoveUp:
          if(!nextState) { 
            return 
          }
          if(this.currIndex > 0){
            this.currIndex -= 1
          } else {
            this.currIndex = nextState.length - 1
          }
          break
      }
      if(this.scroll) {
        this.scroll.scrollToIndex(this.currIndex)
      }
    }
}

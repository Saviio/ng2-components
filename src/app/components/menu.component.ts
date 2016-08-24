import { Component, OnInit, Input, ViewChild, ContentChild, ElementRef, TemplateRef, EventEmitter, Output, SimpleChange, ChangeDetectionStrategy } from '@angular/core'
import { ScrollDirective } from '../directives/scroll'
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

export interface MenuInterface {
  //actived: any[]
  moveUp: () => void
  moveDown: () => void
  submit: () => void
  //onClear: (input: HTMLInputElement) => void
  //isActive: Function
}

// [ngForOf] = "items | async"  items => Observable
@Component({
    selector: 'menu-list',
    template: `
      <ul scroll>
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
    styles: [
      `
        ul,ol{
          padding: 0px;
          margin: 0px;
          list-style: none;
        }

        ul{
          overflow-y: auto;
          height:100%;
        }
      `
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuListComponent implements OnInit, MenuInterface{
    //public actived: any[]
    private currIndex: number = -1
    private scrollIndex: number
    private keyboardSubscription: any
    private inputSubscription: any
    private action$ : Subject<any> = new Subject<any>()
    private state$: Observable<any>
    
    @Input() private items: any[] = []
    @Input() private inputElem: any
    @Input() private predicate = (v: any, qs?: String) => true
    @Input() private initialQuery: string
    @Output() enter: EventEmitter<any> = new EventEmitter<any>()

    @ViewChild(ScrollDirective) private scroll: ScrollDirective
    @ContentChild(TemplateRef) private template: any

    public get activedIndex() : number {
      return this.currIndex
    } 

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
            .debounceTime(318)
            .filter((event: KeyboardEvent) => /^$|^([a-zA-Z0-9\u4e00-\u9fa5_ -]+)$/.test((<HTMLInputElement>event.target).value))
            .map((event: KeyboardEvent) => (<HTMLInputElement>event.target).value)
            .do(value => {
              let action = 
                value === '' 
                ? { type:Action.Reset, payload: this.items } 
                : { type:Action.Filter, payload: value }

              this.action$.next(action)
            })
            .subscribe()
                    

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
        //console.log(this.template)
              
        /*
        console.log(this.initialQuery)

        if(this.initialQuery !== undefined){
          this.action$.next({ type:Action.Filter, payload: this.initialQuery }) // 为啥不行
        }
        */

        /*
            option::=
                    hover 选中
                    actived 已选中
        */
        // MoveUp 和 MoveDown  向外抛出事件?? 因为还要考虑 option的取消动作，这个是没办法由menu-list自行完成的
        //初始值
        //初始选中的option 预渲染

        /*
          高亮状态
          鼠标悬浮
          选中状态 (由外部控制)
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

    /*onClear(): void {

    }*/

    protected reducer(state, { type, payload }) : any {
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

    ngAfterContentInit(){
      //console.log("v:" + JSON.stringify(this.inputElem.value))
    }


    ngAfterViewChecked(){
      //console.log("v:" + JSON.stringify(this.inputElem.value))
      /*if(this.inputElem.value){
        setTimeout(() => {
          this.action$.next({ type:Action.Filter, payload: this.inputElem.value})
        }, 0)
      }*/
    }
}


/*
          (ngModelChange) = "changeQuery($event)"
          [ngModel] = "current"
          [initialQuery]="current"
*/
@Component({
  selector: 'tb-member-picker',
  template: `
    <div>
      <form>
        <input 
          [placeholder] = "''"
          name = 'member-picker-input'
          autofocus
          autocomplete="off"
          #input
        />
      </form>
      <menu-list
        class="ulList"
        [items]="items" 
        [inputElem]="input" 
        [predicate]="filter" 
        (enter)="onEnter($event)">
          <template let-item="$implicit" let-i="index">
              <li [class.is-active]="i === menuList.activedIndex">
                  {{item?.name}}
              </li>
          </template>
      </menu-list>
    </div>
  `,
  styles:[
    `
      menu-list{
        width: 300px;
        overflow-y: auto;
        display: block;
        height: 120px;
      }

      ul,ol{
        padding:0px;
        margin:0px;
      }

      .is-active {
        background-color: gray;
      }
    `
  ],
  directives: [MenuListComponent]
})
export class MemberPickerComponent implements OnInit {
  public current: any = "h"
  @Input() items: any[] = []
  @ViewChild(MenuListComponent) menuList : MenuListComponent
  
  changeQuery(value){
    //this.items = this.items.filter(this.menu.filterFn)
  }

  ngOnInit(){
    this.current = "h"
    /*setInterval(() => {
      this.menuList.moveDown()
    }, 1000)*/
  }

  filter(item, qs){
    return item.name.indexOf(qs) > -1
  }

  test(){
    console.log('CLICK')
  }

  ngAfterViewInit(){
    console.log(this.menuList)
  }

  onEnter(item){
    console.log(item)
    //console.log('OUTPUT ENTER')
  }
}

/*

<div>
  <form>
    <input />
  </form>
  <tb-menu #menu>
    <ul>
      <li></li>
    </ul>
  </tb-menu>
</div>

        <!--<ul>
          <li *ngFor="let item of list">
            {{item?.content}}
          </li>
        </ul>-->
*/




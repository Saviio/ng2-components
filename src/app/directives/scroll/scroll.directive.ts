import { Directive, ElementRef, Input } from '@angular/core'
import { isNumber } from 'lodash'

const siblings = function(el): any[] {
    let ret = []
    let target = el
    el = el.parentNode.firstChild
    if(!el) {
      return ret
    }

    do { 
      if(el && el !== target && el.nodeType === 1){
        ret.push(el)
      }
     } while (el = el.nextSibling)
    return ret
}


@Directive({
  selector: '[scroll]'
})
export class ScrollDirective {

  private el: HTMLElement
  @Input() highlight: string

  constructor(el: ElementRef) {
    this.el = el.nativeElement
  }

  public clearHighlight(){
    if(this.highlight && this.el.firstChild){
      siblings(this.el.firstChild).forEach(node => 
        node.classList.remove(this.highlight))
    }    
  }

  public scrollToTop() {
    this.el.scrollTop = 0
  }

  public scrollToIndex(index) {
    if (!this.hasScroll()) {
      return
    }
    if (!isNumber(index) || index < 0 || index >= this.el.children.length) {
      return
    }
    let child = this.el.children[index]
    let childHeight = child.getBoundingClientRect().height
    let parentHeight = this.el.getBoundingClientRect().height
    let to = childHeight * (index + 1) + childHeight / 2 - parentHeight
    if(this.highlight){
      child.classList.add(this.highlight)
      siblings(child).forEach(item => item.classList.remove(this.highlight))
    }

    this.scrollTo(this.el, to, 200)
  }

  public scrollTo(element: HTMLElement, to, duration) {
    if (duration <= 0) {
      return
    }
    let diff = to - element.scrollTop
    let tick = diff / duration * 10
    window.setTimeout(() => {
      element.scrollTop = element.scrollTop + tick
      if (element.scrollTop === to) {
        return
      }
      this.scrollTo(element, to, duration - 10)
    }, 10)
  }

  private hasScroll() {
    let css = window.getComputedStyle(this.el)
    return css.maxHeight && css.overflowY === 'auto'
  }
}

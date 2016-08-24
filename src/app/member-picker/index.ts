import { Component } from '@angular/core'
import { MemberPickerComponent } from '../components/member-picker'


const data = [
  {
    name: '赵钱'
  },
  {
    name: '孙李'
  },
  {
    name: '周吴'
  },
  {
    name: '郑王'
  },
  {
    name: '冯陈 '
  },
  {
    name: '褚卫'
  },
  {
    name: '蒋沈'
  },
  {
    name: '韩杨'
  },
  {
    name: '朱秦'
  },
  {
    name: '尤许'
  },
  {
    name: '何吕'
  },
  {
    name: '施张'
  },
  {
    name: '孔曹'
  },
  {
    name: '严华'
  },
  {
    name: 'hero'
  },
  {
    name: 'hello'
  }
]

const data2 = [
  {
    name: 'naruto'
  },
  {
    name: 'micky'
  },
  {
    name: 'dboy'
  }
]


@Component({
  selector: 'member-picker-sample',
  styleUrls: ['./member-picker.css'],
  templateUrl: './member-picker.html',
  directives: [MemberPickerComponent]
})
export class MemberPickerSample {
  public list: any[] = data
  ngOnInit() {
    //setTimeout(() => this.list = data, 500)
    //setTimeout(() => this.list = data2, 6000)
  }
}

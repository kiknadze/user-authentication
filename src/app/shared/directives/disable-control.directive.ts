import { Directive, inject, Input, SimpleChanges } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[disableControl]',
  standalone: true
})
export class DisableControlDirective {
  @Input() disableControl: boolean | null = false;
  private ngControl = inject(NgControl);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disableControl']) {
      const action = changes['disableControl'].currentValue
        ? 'disable'
        : 'enable';
      if (this.ngControl.control) {
        this.ngControl.control[action]();
      }
    }
  }

}

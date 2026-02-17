import { Component, Input } from "@sprig/kit";

// Base icon component with common properties
abstract class BaseIcon {
  @Input() class: string = "w-6 h-6";
}

@Component({
  template: "./users.html",
  selector: "UsersIcon",
})
export class UsersIcon extends BaseIcon {}

@Component({
  template: "./file-text.html",
  selector: "FileTextIcon",
})
export class FileTextIcon extends BaseIcon {}

@Component({
  template: "./clipboard.html",
  selector: "ClipboardIcon",
})
export class ClipboardIcon extends BaseIcon {}

@Component({
  template: "./receipt.html",
  selector: "ReceiptIcon",
})
export class ReceiptIcon extends BaseIcon {}

@Component({
  template: "./trend-up.html",
  selector: "TrendUpIcon",
})
export class TrendUpIcon extends BaseIcon {
  @Input() override class: string = "w-4 h-4";
}

@Component({
  template: "./trend-down.html",
  selector: "TrendDownIcon",
})
export class TrendDownIcon extends BaseIcon {
  @Input() override class: string = "w-4 h-4";
}

@Component({
  template: "./sparkles.html",
  selector: "SparklesIcon",
})
export class SparklesIcon extends BaseIcon {}

@Component({
  template: "./chart.html",
  selector: "ChartIcon",
})
export class ChartIcon extends BaseIcon {}

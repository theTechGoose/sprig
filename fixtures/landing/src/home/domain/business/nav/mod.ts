import { Component } from "@sprig/kit";
import { TranslationsService } from "../../data/translations/mod.ts";

@Component({
  template: "./mod.html",
  island: false,
})
export class NavComponent {
  constructor(private translations: TranslationsService) {}
}

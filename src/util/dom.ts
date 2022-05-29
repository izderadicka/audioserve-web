import { SCROLL_OFFSET } from "../types/constants";

export function clickOutside(node: HTMLElement, excluded?: HTMLElement) {
  const handleClick = (event: Event) => {
    if (
      !node.contains(event.target as Node) &&
      (!excluded || !excluded.contains(event.target as Node))
    ) {
      node.dispatchEvent(new CustomEvent("outclick"));
    }
  };

  document.addEventListener("click", handleClick, true);

  return {
    destroy() {
      document.removeEventListener("click", handleClick, true);
    },
  };
}

export function gainFocus(el: HTMLElement) {
  el.focus();
}

enum Scroll {
  UP,
  DOWN,
  NO,
}

export class Scroller {
  constructor(
    private container: HTMLElement,
    private scrollOffset: number = SCROLL_OFFSET
  ) {}

  needScroll(elem: HTMLElement) {
    const containerTop = this.container.scrollTop;
    const containerBottom = containerTop + this.container.clientHeight;
    const top = elem.offsetTop;
    const bottom = top + elem.clientHeight;
    if (top >= containerTop && bottom <= containerBottom) {
      return Scroll.NO;
    } else if (bottom > containerBottom) {
      return Scroll.UP;
    } else {
      return Scroll.DOWN;
    }
  }

  scrollToView(elem: HTMLElement) {
    const scrollDirection = this.needScroll(elem);
    if (scrollDirection !== Scroll.NO) {
      elem.scrollIntoView(scrollDirection === Scroll.DOWN ? true : false);
      if (scrollDirection === Scroll.UP) {
        this.container.scrollBy({ top: this.scrollOffset });
      }
    }
  }
}

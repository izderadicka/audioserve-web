const defaultOptions: IntersectionObserverInit = {
  rootMargin: "0px",
  threshold: 0,
};

export class Observer {
  observer: IntersectionObserver;

  constructor(
    root_element: HTMLElement,
    options: IntersectionObserverInit = {}
  ) {
    if (typeof IntersectionObserver === "undefined") {
      throw new Error("IntersentionObserver is not supported");
    }

    const mergedOptions: IntersectionObserverInit = Object.assign(
      { root: root_element },
      defaultOptions,
      options
    );
    this.observer = new IntersectionObserver(this.handleEvent, mergedOptions);
  }

  handleEvent(
    entries: IntersectionObserverEntry[],
    _observer: IntersectionObserver
  ) {
    entries.forEach((e) => {
      e.target.dispatchEvent(
        new CustomEvent<IntersectionObserverEntry>("intersect", { detail: e })
      );
    });
  }

  observe(elem: HTMLElement) {
    this.observer.observe(elem);
    return {
      destroy: () => {
        this.observer.unobserve(elem);
      },
    };
  }

  close() {
    this.observer.disconnect();
  }
}

<script lang="ts" context="module">
  const isScrollbarVisible = () => {
    return document.body.scrollHeight > screen.height;
  };

  const getScrollbarWidth = () => {
    // Creating invisible container
    const outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.overflow = "scroll"; // forcing scrollbar to appear
    // @ts-ignore
    outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps
    document.body.appendChild(outer);

    // Creating inner element and placing it in the container
    const inner = document.createElement("div");
    outer.appendChild(inner);

    // Calculating difference between container's full width and the child width
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

    // Removing temporary elements from the DOM
    outer.parentNode.removeChild(outer);

    return scrollbarWidth;
  };
</script>

<script lang="ts">
  import { onDestroy } from "svelte";

  const isOpenClass = "modal-is-open";
  const openingClass = "modal-is-opening";
  const closingClass = "modal-is-closing";
  const animationDuration = 400; // ms
  let visibleModal = null;

  export let id: string;
  export let confirmAction: () => void = null;
  export let noConfirm = false;
  export let confirmName = "Confirm";

  // Toggle modal
  export const toggleModal = (event?) => {
    event?.preventDefault();
    const modal = document.getElementById(id);
    typeof modal != "undefined" && modal != null && isModalOpen(modal)
      ? closeModal(modal)
      : openModal(modal);
  };

  let finishDialog = null;

  export const waitForDialog = (): Promise<boolean> => {
    return new Promise((resolve) => {
      finishDialog = resolve;
    });
  };

  const updateConfirmed = () => {
    if (finishDialog) {
      finishDialog(true);
    }
    finishDialog = null;
  };

  const updateCanceled = () => {
    if (finishDialog) {
      finishDialog(false);
    }
    finishDialog = null;
  };

  const confirmModal = (event) => {
    updateConfirmed();
    toggleModal(event);
    if (confirmAction) {
      confirmAction();
    }
  };

  // Is modal open
  const isModalOpen = (modal) => {
    return modal.hasAttribute("open") && modal.getAttribute("open") != "false"
      ? true
      : false;
  };

  // Open modal
  const openModal = (modal) => {
    if (isScrollbarVisible()) {
      document.documentElement.style.setProperty(
        "--scrollbar-width",
        `${getScrollbarWidth()}px`
      );
    }
    document.documentElement.classList.add(isOpenClass, openingClass);
    setTimeout(() => {
      visibleModal = modal;
      document.documentElement.classList.remove(openingClass);
    }, animationDuration);
    modal.setAttribute("open", true);
  };

  // Close modal
  const closeModal = (modal) => {
    visibleModal = null;
    document.documentElement.classList.add(closingClass);
    updateCanceled();
    setTimeout(() => {
      document.documentElement.classList.remove(closingClass, isOpenClass);
      document.documentElement.style.removeProperty("--scrollbar-width");
      modal.removeAttribute("open");
    }, animationDuration);
  };

  const closeOnOutsideClick = (event) => {
    if (visibleModal != null) {
      const modalContent = visibleModal.querySelector("article");
      const isClickInside = modalContent.contains(event.target);
      !isClickInside && closeModal(visibleModal);
    }
  };
  document.addEventListener("click", closeOnOutsideClick);

  const closeOnEscapekey = (event) => {
    if (event.key === "Escape" && visibleModal != null) {
      closeModal(visibleModal);
    }
  };
  document.addEventListener("keydown", closeOnEscapekey);

  onDestroy(() => {
    document.removeEventListener("click", closeOnOutsideClick);
    document.removeEventListener("click", closeOnEscapekey);
  });
</script>

<dialog {id}>
  <article>
    <!-- svelte-ignore a11y-missing-content -->
    <a href="#close" aria-label="Close" class="close" on:click={toggleModal} />
    <h3><slot name="header" /></h3>
    <p>
      <slot name="body" />
    </p>
    <footer>
      <a href="#cancel" role="button" class="secondary" on:click={toggleModal}>
        Cancel
      </a>

      {#if !noConfirm}
        <a href="#confirm" role="button" on:click={confirmModal}>
          {confirmName}
        </a>
      {/if}
    </footer>
  </article>
</dialog>

export function clickOutside( node: HTMLElement, excluded?: HTMLElement) {
    
	const handleClick = (event: Event) => {
		if (!node.contains(event.target as Node) && (!excluded || !excluded.contains(event.target as Node))) {
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
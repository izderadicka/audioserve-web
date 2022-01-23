export function clickOutside( excludedId?: string) {
    
    
    const inner = (node: HTMLElement) => {
	const handleClick = (event: Event) => {
        const excluded = document.getElementById(excludedId);
		if (!node.contains(event.target as Node) && (!excluded || !excluded.contains(event.target as Node))) {
            console.debug("outclick target", event.target);
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
return inner;
}
export class Router {
    constructor() {
        this.routes = {};
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.navigateToCurrentRoute());
    }

    // Add a route
    addRoute(route, callback) {
        this.routes[route] = callback;
    }

    // Navigate to a specific route
    navigateTo(route) {
        window.location.hash = route;
    }

    // Navigate to the current route based on the hash
    navigateToCurrentRoute() {
        const route = window.location.hash.slice(1) || '';
        
        if (this.routes[route]) {
            this.routes[route]();
        } else {
            // Default route if not found
            if (this.routes['']) {
                this.routes['']();
            }
        }
    }
} 
import * as THREE from 'three';

export class ObjectExplorer {
    constructor(scene, viewer) {
        this.scene = scene;
        this.viewer = viewer;
        this.objectTree = [];
        this.filteredObjects = [];
        this.categories = new Map();
        this.setupUI();
    }

    setupUI() {
        const explorerPanel = document.getElementById('object-explorer');
        if (!explorerPanel) return;

        // Search input
        const searchInput = document.getElementById('object-search');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Category filters
        this.setupCategoryFilters();
    }

    setupCategoryFilters() {
        const categoriesContainer = document.getElementById('categories-list');
        if (!categoriesContainer) return;

        // Clear existing
        categoriesContainer.innerHTML = '';

        // Create category checkboxes
        this.categories.forEach((objects, category) => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `cat-${category}`;
            checkbox.checked = true;
            checkbox.addEventListener('change', (e) => {
                this.toggleCategory(category, e.target.checked);
            });

            const label = document.createElement('label');
            label.htmlFor = `cat-${category}`;
            label.textContent = `${category} (${objects.length})`;

            const colorIndicator = document.createElement('span');
            colorIndicator.className = 'color-indicator';
            colorIndicator.style.backgroundColor = this.getCategoryColor(category);

            categoryItem.appendChild(checkbox);
            categoryItem.appendChild(colorIndicator);
            categoryItem.appendChild(label);
            categoriesContainer.appendChild(categoryItem);
        });
    }

    analyzeScene() {
        this.objectTree = [];
        this.categories.clear();

        this.scene.traverse((object) => {
            if (object.isMesh) {
                // Extract category from object type or name
                const category = this.extractCategory(object);

                if (!this.categories.has(category)) {
                    this.categories.set(category, []);
                }
                this.categories.get(category).push(object);

                this.objectTree.push({
                    object,
                    name: object.name || 'Unnamed',
                    type: object.type,
                    category,
                    visible: true
                });
            }
        });

        this.setupCategoryFilters();
        this.updateObjectList();
    }

    extractCategory(object) {
        // Try to extract category from IFC data or object name
        if (object.userData && object.userData.ifcType) {
            return object.userData.ifcType;
        }

        const name = object.name.toLowerCase();

        if (name.includes('wall')) return 'Walls';
        if (name.includes('floor') || name.includes('slab')) return 'Floors';
        if (name.includes('roof')) return 'Roofs';
        if (name.includes('door')) return 'Doors';
        if (name.includes('window')) return 'Windows';
        if (name.includes('column')) return 'Columns';
        if (name.includes('beam')) return 'Beams';
        if (name.includes('stair')) return 'Stairs';
        if (name.includes('railing')) return 'Railings';
        if (name.includes('furniture')) return 'Furniture';

        return 'Other';
    }

    getCategoryColor(category) {
        const colors = {
            'Walls': '#ff6b6b',
            'Floors': '#4ecdc4',
            'Roofs': '#95e1d3',
            'Doors': '#f38181',
            'Windows': '#a8e6cf',
            'Columns': '#ffd93d',
            'Beams': '#6bcf7f',
            'Stairs': '#ff8b94',
            'Railings': '#c7ceea',
            'Furniture': '#b8a9c9',
            'Other': '#999999'
        };
        return colors[category] || '#999999';
    }

    handleSearch(query) {
        query = query.toLowerCase().trim();

        if (query === '') {
            this.filteredObjects = [...this.objectTree];
        } else {
            this.filteredObjects = this.objectTree.filter(item => {
                return item.name.toLowerCase().includes(query) ||
                       item.type.toLowerCase().includes(query) ||
                       item.category.toLowerCase().includes(query);
            });
        }

        this.updateObjectList();
    }

    updateObjectList() {
        const listContainer = document.getElementById('objects-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        const itemsToShow = this.filteredObjects.length > 0 ? this.filteredObjects : this.objectTree;

        if (itemsToShow.length === 0) {
            listContainer.innerHTML = '<p style="color: #666; padding: 10px;">No objects found</p>';
            return;
        }

        itemsToShow.forEach(item => {
            const objectItem = document.createElement('div');
            objectItem.className = 'object-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.visible;
            checkbox.addEventListener('change', (e) => {
                this.toggleObjectVisibility(item.object, e.target.checked);
            });

            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.name;
            nameSpan.className = 'object-name';
            nameSpan.addEventListener('click', () => {
                this.viewer.selectObject(item.object);
                this.viewer.focusOnObject(item.object);
            });

            const typeSpan = document.createElement('span');
            typeSpan.textContent = item.category;
            typeSpan.className = 'object-type';
            typeSpan.style.color = this.getCategoryColor(item.category);

            objectItem.appendChild(checkbox);
            objectItem.appendChild(nameSpan);
            objectItem.appendChild(typeSpan);
            listContainer.appendChild(objectItem);
        });

        // Update count
        const countElement = document.getElementById('object-count-display');
        if (countElement) {
            countElement.textContent = `${itemsToShow.length} objects`;
        }
    }

    toggleCategory(category, visible) {
        const objects = this.categories.get(category);
        if (!objects) return;

        objects.forEach(object => {
            object.visible = visible;
        });

        // Update object tree
        this.objectTree.forEach(item => {
            if (item.category === category) {
                item.visible = visible;
            }
        });

        this.updateObjectList();
    }

    toggleObjectVisibility(object, visible) {
        object.visible = visible;

        // Update in object tree
        const item = this.objectTree.find(i => i.object === object);
        if (item) {
            item.visible = visible;
        }
    }

    isolateObject(object) {
        // Hide all objects except the selected one
        this.objectTree.forEach(item => {
            item.object.visible = false;
            item.visible = false;
        });

        object.visible = true;
        const item = this.objectTree.find(i => i.object === object);
        if (item) {
            item.visible = true;
        }

        this.updateObjectList();
    }

    showAll() {
        this.objectTree.forEach(item => {
            item.object.visible = true;
            item.visible = true;
        });
        this.updateObjectList();
    }

    hideAll() {
        this.objectTree.forEach(item => {
            item.object.visible = false;
            item.visible = false;
        });
        this.updateObjectList();
    }

    colorByCategory() {
        this.categories.forEach((objects, category) => {
            const color = new THREE.Color(this.getCategoryColor(category));
            objects.forEach(object => {
                if (object.material) {
                    const material = object.material.clone();
                    material.color = color;
                    object.material = material;
                }
            });
        });
    }

    resetColors() {
        this.objectTree.forEach(item => {
            if (item.object.userData.originalMaterial) {
                item.object.material = item.object.userData.originalMaterial;
            }
        });
    }
}

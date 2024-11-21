class Sidebar {
    constructor(mindMap) {
        this.mindMap = mindMap;
        this.sidebar = document.getElementById('sidebar');
        this.nodeList = document.getElementById('nodeList');
        this.toggle = document.getElementById('sidebarToggle');
        this.resizer = document.getElementById('sidebarResizer');
        this.isResizing = false;
        this.startX = 0;
        this.startWidth = 0;
        this.currentWidth = 300; // Default width
        
        this.setupSidebar();
        this.setupImportExport();
    }
    setupSidebar() {
        // Toggle sidebar
        this.toggle.addEventListener('click', () => {
            if (this.sidebar.classList.contains('open')) {
                this.sidebar.style.right = `-${this.currentWidth}px`;
                this.sidebar.classList.remove('open');
            } else {
                this.sidebar.style.right = '0';
                this.sidebar.classList.add('open');
            }
        });
        // Sidebar resizing
        this.resizer.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            this.startX = e.pageX;
            this.startWidth = this.currentWidth;
            
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
        });
        // Initial setup
        this.sidebar.style.width = `${this.currentWidth}px`;
        this.sidebar.style.right = 0;/*`-${this.currentWidth}px`;*/
        this.sidebar.classList.add('open');
        
        this.update();
    }
    handleMouseMove = (e) => {
        if (!this.isResizing) return;
        
        const width = this.startWidth - (e.pageX - this.startX);
        if (width >= 200 && width <= 800) { // Min and max width limits
            this.currentWidth = width;
            this.sidebar.style.width = `${width}px`;
            
            // Update position if sidebar is closed
            if (!this.sidebar.classList.contains('open')) {
                this.sidebar.style.right = `-${width}px`;
            }
        }
    }
    handleMouseUp = () => {
        this.isResizing = false;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }
    update() {
        if (!this.nodeList) return;
        
        this.nodeList.innerHTML = '';
        const nodeMap = new Map();
        this.mindMap.nodes.forEach(node => {
            nodeMap.set(node, []);
        });
        this.mindMap.edges.forEach(edge => {
            if (edge.style === 'arrow') {
                const parent = edge.start;
                const child = edge.end;
                if (nodeMap.has(parent)) {
                    nodeMap.get(parent).push(child);
                }
            }
        });
        const rootNodes = this.mindMap.nodes.filter(node => 
            !this.mindMap.edges.some(edge => 
                edge.style === 'arrow' && edge.end === node
            )
        );
        const buildNodeTree = (node, level = 0) => {
            if (!nodeMap.has(node)) return;
            const div = document.createElement('div');
            div.className = 'node-item';
            div.style.marginLeft = `${level * 20 + 12}px`;
            div.textContent = node.text || 'Untitled';
            
            div.style.backgroundColor = node.nodeColor || this.mindMap.defaultNodeColor;
            div.style.color = node.textColor || '#000000';
            
            const borderColor = this.mindMap.darkenColor(node.nodeColor || this.mindMap.defaultNodeColor, 0.15);
            div.style.borderColor = borderColor;
            if (node === this.mindMap.selectedNode) {
                div.classList.add('selected');
            }
            div.addEventListener('click', () => {
                this.mindMap.selectedNode = node;
                this.mindMap.textColor.value = node.textColor;
                this.mindMap.fontSize.value = node.fontSize.toString();
                this.mindMap.nodeColor.value = node.nodeColor || this.mindMap.defaultNodeColor;
                
                this.update();
                this.mindMap.needsRedraw = true;
            });
            this.nodeList.appendChild(div);
            const children = nodeMap.get(node) || [];
            children.forEach(child => {
                if (nodeMap.has(child)) {
                    buildNodeTree(child, level + 1);
                }
            });
        };
        rootNodes.forEach(node => buildNodeTree(node));
    }
    setupImportExport() {
        const exportBtn = document.getElementById('exportJSON');
        const importBtn = document.getElementById('importJSON');
        const fileInput = document.getElementById('fileInput');
        exportBtn.addEventListener('click', () => this.exportToJSON());
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.importFromJSON(e));
    }
    exportToJSON() {
        const data = {
            nodes: this.mindMap.nodes.map(node => ({
                x: node.x,
                y: node.y,
                text: node.text,
                fontSize: node.fontSize,
                textColor: node.textColor,
                nodeColor: node.nodeColor,
                width: node.width,
                height: node.height,
                padding: node.padding
            })),
            edges: this.mindMap.edges.map(edge => ({
                startIndex: this.mindMap.nodes.indexOf(edge.start),
                endIndex: this.mindMap.nodes.indexOf(edge.end),
                style: edge.style
            }))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mindmap.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    importFromJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                this.mindMap.nodes = data.nodes.map(node => ({
                    ...node,
                    width: node.width || 100,
                    height: node.height || 40,
                    padding: node.padding || 20
                }));
                this.mindMap.edges = data.edges.map(edge => ({
                    start: this.mindMap.nodes[edge.startIndex],
                    end: this.mindMap.nodes[edge.endIndex],
                    style: edge.style
                }));
                this.mindMap.saveToLocalStorage();
                this.update();
                this.mindMap.needsRedraw = true;
            } catch (error) {
                console.error('Error importing file:', error);
                alert('Error importing file. Please make sure it\'s a valid JSON file.');
            }
        };
        reader.readAsText(file);
    }
} 

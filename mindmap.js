class MindMap {
  constructor() {
    this.canvas = document.getElementById('mindmapCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.currentTool = 'move';
    this.isDragging = false;
    this.selectedNode = null;
    this.offset = { x: 0, y: 0 };
    this.scale = 0.1;
    this.lastMousePos = { x: 0, y: 0 };
    this.textInput = document.getElementById('textInput');
    this.editingNode = null;
    this.defaultFontSize = 16;
    this.defaultTextColor = '#000000';
    // Add edge style control
    this.edgeStyle = document.getElementById('edgeStyle');
    this.edgeStyle.addEventListener('change', () => {
      if (this.selectedEdge) {
        this.selectedEdge.style = this.edgeStyle.value;
        this.saveToLocalStorage();
        this.needsRedraw = true;
      }
    });
    
    this.selectedEdge = null;
    this.edges = [];
    
    // Add text styling controls
    this.textColor = document.getElementById('textColor');
    this.fontSize = document.getElementById('fontSize');
    // Add zoom level display
    this.zoomLevelDisplay = document.getElementById('zoomLevel');
    this.updateZoomLevel();
    // Load saved mindmap data
    this.loadFromLocalStorage();
    
    this.initializeCanvas();
    this.setupEventListeners();
    // Add download SVG button handler
    document.getElementById('downloadSvg').addEventListener('click', () => this.downloadAsSVG());
    this.draggedNode = null;
    
    // Add event listeners for text styling controls
    this.textColor.addEventListener('input', () => this.updateSelectedNodeStyle());
    this.fontSize.addEventListener('input', () => this.updateSelectedNodeStyle());
    // Add node color control
    this.nodeColor = document.getElementById('nodeColor');
    
    // Add event listener for node color changes
    this.nodeColor.addEventListener('input', () => this.updateSelectedNodeStyle());
    
    // Set default node color
    this.defaultNodeColor = '#fff3bf';
    // Add requestAnimationFrame handling
    this.animationFrameId = null;
    this.needsRedraw = false;
    // Add viewport tracking
    this.viewport = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight
    };
    // Start render loop
    this.startRenderLoop();
    // Add color preset handling
    this.setupColorPresets();
    
    // Add clear all button handler
    document.getElementById('clearAll').addEventListener('click', () => this.handleClearAll());
    
    this.tempEdgeStart = null;
    this.selectedEdge = null;
    this.hoveredEdge = null;
    // Initialize the sidebar
    this.sidebar = new Sidebar(this);
    // Initialize renderers
    this.nodeRenderer = new NodeRenderer(this);
    this.edgeRenderer = new EdgeRenderer(this);
  }
  
  startRenderLoop() {
    const render = () => {
      if (this.needsRedraw) {
        console.log(this.scale)
        this.draw();
        this.needsRedraw = false;
      }
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  // Update viewport calculation
  updateViewport() {
    const margin = 100; // Extra margin to prevent pop-in
    this.viewport = {
      left: -this.offset.x / this.scale - margin,
      top: -this.offset.y / this.scale - margin,
      right: (this.canvas.width - this.offset.x) / this.scale + margin,
      bottom: (this.canvas.height - this.offset.y) / this.scale + margin
    };
  }

  // Check if node is in viewport
  isNodeInViewport(node) {
    const nodeLeft = node.x - node.width/2;
    const nodeRight = node.x + node.width/2;
    const nodeTop = node.y - node.height/2;
    const nodeBottom = node.y + node.height/2;
    return nodeRight >= this.viewport.left &&
           nodeLeft <= this.viewport.right &&
           nodeBottom >= this.viewport.top &&
           nodeTop <= this.viewport.bottom;
  }

  initializeCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupEventListeners() {
    // Toolbar buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool;
        
        // Update cursor
        this.canvas.classList.remove('move-tool', 'edit-text-tool', 'add-node-tool', 'add-edge-tool');
        this.canvas.classList.add(`${this.currentTool}-tool`);
      });
    });
    // Set initial cursor
    this.canvas.classList.add('move-tool');
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
  }

  handleDoubleClick(e) {
    if (e.button === 0) { // Left click
      const pos = this.getMousePos(e);
      const clickedNode = this.findNodeAtPosition(pos);
      if (clickedNode) {
        this.editNodeText(clickedNode, pos);
      }
    }   
  }

  handleMouseDown(e) {
    if (e.button === 0) { // Left click
        const pos = this.getMousePos(e);
        const clickedNode = this.findNodeAtPosition(pos);
        switch (this.currentTool) {
            case 'move':
                if (clickedNode) {
                    this.draggedNode = clickedNode;
                } else {
                    this.isDragging = true;
                }
                break;
            case 'select':
                this.selectedNode = null;
                if (clickedNode) {
                    this.selectedNode = clickedNode;
                    // Update node style controls
                    this.textColor.value = clickedNode.textColor;
                    this.fontSize.value = clickedNode.fontSize.toString();
                    this.nodeColor.value = clickedNode.nodeColor || this.defaultNodeColor;
                }
                break;
            case 'addNode':
                const newNode = {
                    x: (pos.x - this.offset.x) / this.scale,
                    y: (pos.y - this.offset.y) / this.scale,
                    text: 'New Node',
                    fontSize: parseInt(this.fontSize.value),
                    textColor: this.textColor.value,
                    nodeColor: this.nodeColor.value || this.defaultNodeColor,
                    width: 100,
                    height: 40,
                    padding: 20
                };
                this.nodes.push(newNode);
                this.editNodeText(newNode, pos);
                break;
            case 'addEdge':
                if (clickedNode) {
                    if (!this.tempEdgeStart) {
                        this.tempEdgeStart = clickedNode;
                    } else if (clickedNode !== this.tempEdgeStart) {
                        // Check if this edge already exists
                        const edgeExists = this.edges.some(edge => 
                            (edge.start === this.tempEdgeStart && edge.end === clickedNode) ||
                            (edge.start === clickedNode && edge.end === this.tempEdgeStart)
                        );
                        
                        if (!edgeExists) {
                            // Create new edge
                            this.edges.push({
                                start: this.tempEdgeStart,
                                end: clickedNode,
                                style: this.edgeStyle.value
                            });
                            this.saveToLocalStorage();
                        }
                        this.tempEdgeStart = null;
                    }
                }
                break;
            case 'editText':
                if (clickedNode) {
                    this.editNodeText(clickedNode, pos);
                }
                break;
        }
        this.lastMousePos = pos;
        this.needsRedraw = true;
    }
  }

  handleMouseMove(e) {
    const pos = this.getMousePos(e);
    
    // Only check for node hover in select mode
    if (this.currentTool === 'select') {
      const hoveredNode = this.findNodeAtPosition(pos);
      this.canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
    }
    if (this.draggedNode) {
      this.draggedNode.x = (pos.x - this.offset.x) / this.scale;
      this.draggedNode.y = (pos.y - this.offset.y) / this.scale;
      
      if (this.editingNode === this.draggedNode) {
        this.updateTextInputPosition();
      }
      this.needsRedraw = true; // Ensure edges update when moving nodes
    } else if (this.isDragging) {
      this.offset.x += pos.x - this.lastMousePos.x;
      this.offset.y += pos.y - this.lastMousePos.y;
      
      if (this.editingNode) {
        this.updateTextInputPosition();
      }
      this.needsRedraw = true;
    }
    this.lastMousePos = pos;
  }

  handleMouseUp() {
    this.isDragging = false;
    this.draggedNode = null;
    this.saveToLocalStorage();
    this.sidebar.update();
  }

  handleContextMenu(e) {
    e.preventDefault();
    const pos = this.getMousePos(e);
    const clickedNode = this.findNodeAtPosition(pos);
    const clickedEdge = this.findEdgeAtPosition(pos);
    if (clickedNode) {
      this.edges = this.edges.filter(edge => 
        edge.start !== clickedNode && edge.end !== clickedNode
      );
      this.nodes = this.nodes.filter(node => node !== clickedNode);
      this.sidebar.update();
      this.needsRedraw = true;
      this.saveToLocalStorage();
    } else if (clickedEdge) {
      this.edges = this.edges.filter(edge => edge !== clickedEdge);
      this.sidebar.update();
      this.needsRedraw = true;
      this.saveToLocalStorage();
    }
  }

  handleWheel(e) {
    e.preventDefault();
    const pos = this.getMousePos(e);
    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    
    // Adjust scale
    this.scale *= zoom;
    
    // Adjust offset to zoom towards mouse position
    this.offset.x = pos.x - (pos.x - this.offset.x) * zoom;
    this.offset.y = pos.y - (pos.y - this.offset.y) * zoom;
    
    // Update text input position and size if editing
    if (this.editingNode) {
      this.updateTextInputPosition();
    }
    
    // Update zoom level display
    this.updateZoomLevel();
    
    this.draw();
    this.saveToLocalStorage(); // Save after zooming
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  findNodeAtPosition(pos) {
    return this.nodeRenderer.findNodeAtPosition(pos);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.updateViewport();

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = this.canvas.width;
    offscreenCanvas.height = this.canvas.height;
    const offscreenCtx = offscreenCanvas.getContext('2d');

    // Draw edges first
    this.edges.forEach(edge => {
      this.edgeRenderer.drawEdge(edge, offscreenCtx);
    });

    // Draw temporary edge if adding edge
    if (this.tempEdgeStart && this.currentTool === 'addEdge') {
      const startCenter = {
        x: this.tempEdgeStart.x * this.scale + this.offset.x,
        y: this.tempEdgeStart.y * this.scale + this.offset.y
      };
      const mousePos = this.lastMousePos;
      
      const startIntersect = this.edgeRenderer.getNodeIntersection(
        this.tempEdgeStart,
        startCenter,
        mousePos
      );

      offscreenCtx.beginPath();
      offscreenCtx.moveTo(startIntersect.x, startIntersect.y);
      offscreenCtx.lineTo(mousePos.x, mousePos.y);
      offscreenCtx.strokeStyle = '#999';
      offscreenCtx.lineWidth = 2 * this.scale;
      offscreenCtx.setLineDash([5 * this.scale]);
      offscreenCtx.stroke();
      offscreenCtx.setLineDash([]);
    }

    // Draw nodes
    const sortedNodes = [...this.nodes].reverse();
    sortedNodes.forEach(node => {
      if (this.isNodeInViewport(node)) {
        this.nodeRenderer.drawNode(node, offscreenCtx);
      }
    });

    // Draw node indicators
    sortedNodes.forEach(node => {
      if (!this.isNodeInViewport(node)) return;

      const x = node.x * this.scale + this.offset.x;
      const y = node.y * this.scale + this.offset.y;
      const width = node.width * this.scale;
      const height = node.height * this.scale;
      const radius = 10 * this.scale;
      const padding = 5 * this.scale;

      if (this.checkNodeOverlap(node)) {
        this.nodeRenderer.drawIndicator(x, y, width, height, radius, padding, '#ff0000', [], offscreenCtx);
      }

      if (node === this.selectedNode) {
        this.nodeRenderer.drawIndicator(x, y, width, height, radius, padding, '#007bff', [5 * this.scale], offscreenCtx);
      }
    });

    this.ctx.drawImage(offscreenCanvas, 0, 0);
  }

  editNodeText(node, pos) {
    this.editingNode = node;
    this.textInput.value = node.text || '';
    this.textInput.style.fontSize = `${node.fontSize * this.scale}px`;
    this.textInput.style.color = node.textColor;
    this.textInput.style.display = 'block';
    
    // Update text input position and size according to scale
    this.updateTextInputPosition();
    
    this.textInput.focus();
    this.textInput.select();
    const handleBlur = () => {
      if (this.editingNode) {
        this.editingNode.text = this.textInput.value;
        this.editingNode.fontSize = parseInt(this.fontSize.value);
        this.editingNode.textColor = this.textColor.value;
        this.updateNodeSize(this.editingNode);
        this.editingNode = null;
        this.textInput.style.display = 'none';
        this.saveToLocalStorage();
        this.sidebar.update();
        this.draw();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.textInput.blur();
      }
    };
    // Remove existing event listeners
    this.textInput.removeEventListener('blur', handleBlur);
    this.textInput.removeEventListener('keydown', handleKeyDown);
    
    // Add new event listeners
    this.textInput.addEventListener('blur', handleBlur);
    this.textInput.addEventListener('keydown', handleKeyDown);
    // Handle input changes to resize node in real-time
    const handleInput = () => {
      if (this.editingNode) {
        this.editingNode.text = this.textInput.value;
        this.updateNodeSize(this.editingNode);
        this.updateTextInputPosition();
        this.draw();
      }
    };
    this.textInput.removeEventListener('input', handleInput);
    this.textInput.addEventListener('input', handleInput);
  }

  updateTextInputPosition() {
    if (!this.editingNode) return;
    
    const scaledWidth = this.editingNode.width * this.scale;
    const scaledHeight = this.editingNode.height * this.scale;
    
    this.textInput.style.left = `${this.editingNode.x * this.scale + this.offset.x - scaledWidth/2}px`;
    this.textInput.style.top = `${this.editingNode.y * this.scale + this.offset.y - scaledHeight/2}px`;
    this.textInput.style.width = `${scaledWidth}px`;
    this.textInput.style.height = `${scaledHeight}px`;
    this.textInput.style.fontSize = `${this.editingNode.fontSize * this.scale}px`;
  }

  handleTextInputCleanup() {
    if (this.editingNode) {
        this.textInput.blur();
        this.editingNode = null;
        this.textInput.style.display = 'none';
        this.draw();
    }
  }

  // Add new method to update zoom level display
  updateZoomLevel() {
    const zoomPercentage = Math.round(this.scale * 1000);
    this.zoomLevelDisplay.textContent = `${zoomPercentage}%`;
  }

  // Add new methods for local storage
  saveToLocalStorage() {
    // Create a clean copy of the data for storage
    const data = {
        nodes: this.nodes.map(node => ({
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
        edges: this.edges.map(edge => ({
            start: {
                x: edge.start.x,
                y: edge.start.y,
                text: edge.start.text,
                width: edge.start.width,
                height: edge.start.height
            },
            end: {
                x: edge.end.x,
                y: edge.end.y,
                text: edge.end.text,
                width: edge.end.width,
                height: edge.end.height
            },
            style: edge.style
        })),
        offset: this.offset,
        scale: this.scale
    };
    
    localStorage.setItem('mindmapData', JSON.stringify(data));
  }

  loadFromLocalStorage() {
    const savedData = localStorage.getItem('mindmapData');
    if (savedData) {
        const data = JSON.parse(savedData);
        
        // First load nodes
        this.nodes = data.nodes || [];
        this.edges = [];
        // Then reconstruct edges with proper node references
        if (data.edges) {
            data.edges.forEach(savedEdge => {
                // Find the actual node references in the loaded nodes array
                const startNode = this.nodes.find(node => 
                    node.x === savedEdge.start.x && 
                    node.y === savedEdge.start.y && 
                    node.text === savedEdge.start.text
                );
                const endNode = this.nodes.find(node => 
                    node.x === savedEdge.end.x && 
                    node.y === savedEdge.end.y && 
                    node.text === savedEdge.end.text
                );
                // Only create edge if both nodes exist
                if (startNode && endNode) {
                    this.edges.push({
                        start: startNode,  // Use the actual node reference
                        end: endNode,      // Use the actual node reference
                        style: savedEdge.style
                    });
                }
            });
        }
        this.offset = data.offset || { x: 0, y: 0 };
        this.scale = data.scale || 1;
        this.updateZoomLevel();
    }
  }

  // Add these new methods for SVG export
  downloadAsSVG() {
    const svgContent = this.generateSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mindmap.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  generateSVG() {
    // Calculate the bounds of all nodes
    const bounds = this.calculateBounds();
    const padding = 50; // Add some padding around the content
    // Create SVG header with calculated dimensions
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="${bounds.width + padding * 2}" height="${bounds.height + padding * 2}" 
         viewBox="${bounds.minX - padding} ${bounds.minY - padding} 
                 ${bounds.width + padding * 2} ${bounds.height + padding * 2}"
         xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style type="text/css">
        @font-face {
          font-family: 'Arial';
          src: local('Arial');
        }
      </style>
    </defs>`;
    // Add nodes
    this.nodes.forEach(node => {
      // Create rounded rectangle
      const radius = 10;
      const path = `
        M ${node.x - node.width/2 + radius} ${node.y - node.height/2}
        H ${node.x + node.width/2 - radius}
        Q ${node.x + node.width/2} ${node.y - node.height/2} ${node.x + node.width/2} ${node.y - node.height/2 + radius}
        V ${node.y + node.height/2 - radius}
        Q ${node.x + node.width/2} ${node.y + node.height/2} ${node.x + node.width/2 - radius} ${node.y + node.height/2}
        H ${node.x - node.width/2 + radius}
        Q ${node.x - node.width/2} ${node.y + node.height/2} ${node.x - node.width/2} ${node.y + node.height/2 - radius}
        V ${node.y - node.height/2 + radius}
        Q ${node.x - node.width/2} ${node.y - node.height/2} ${node.x - node.width/2 + radius} ${node.y - node.height/2}
        Z`;
      svg += `
        <path d="${path}"
              fill="white"
              stroke="#333333"
              stroke-width="2"/>
        <text x="${node.x}"
              y="${node.y}"
              font-family="Arial"
              font-size="${node.fontSize}px"
              fill="${node.textColor}"
              text-anchor="middle"
              dominant-baseline="middle">${this.escapeXML(node.text)}</text>`;
    });
    svg += '</svg>';
    return svg;
  }

  calculateBounds() {
    if (this.nodes.length === 0) {
      return { minX: 0, minY: 0, width: 800, height: 600 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    this.nodes.forEach(node => {
      minX = Math.min(minX, node.x - node.width/2);
      minY = Math.min(minY, node.y - node.height/2);
      maxX = Math.max(maxX, node.x + node.width/2);
      maxY = Math.max(maxY, node.y + node.height/2);
    });
    return {
      minX: minX,
      minY: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  escapeXML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  updateSelectedNodeStyle() {
    if (this.selectedNode) {
      this.selectedNode.textColor = this.textColor.value;
      this.selectedNode.fontSize = parseInt(this.fontSize.value);
      if (this.nodeColor.value) {
        this.selectedNode.nodeColor = this.nodeColor.value;
      }
      this.updateNodeSize(this.selectedNode);
      this.saveToLocalStorage();
      this.draw();
    }
  }

  // Add new helper method to darken colors
  darkenColor(color, amount) {
    // Convert hex to RGB
    let r = parseInt(color.substring(1,3), 16);
    let g = parseInt(color.substring(3,5), 16);
    let b = parseInt(color.substring(5,7), 16);
    // Darken each component
    r = Math.max(0, Math.floor(r * (1 - amount)));
    g = Math.max(0, Math.floor(g * (1 - amount)));
    b = Math.max(0, Math.floor(b * (1 - amount)));
    // Convert back to hex
    return '#' + 
      (r.toString(16).padStart(2, '0')) +
      (g.toString(16).padStart(2, '0')) +
      (b.toString(16).padStart(2, '0'));
  }

  setupColorPresets() {
    const presets = document.querySelectorAll('.color-preset');
    presets.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = preset.style.backgroundColor;
        // Convert RGB to HEX
        const hex = this.rgbToHex(color);
        this.nodeColor.value = hex;
        this.updateSelectedNodeStyle();
        
        // Update active state
        presets.forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
      });
    });
  }

  rgbToHex(rgb) {
    // Convert "rgb(r, g, b)" to hex
    const values = rgb.match(/\d+/g);
    const r = parseInt(values[0]);
    const g = parseInt(values[1]);
    const b = parseInt(values[2]);
    
    return '#' + 
      (r.toString(16).padStart(2, '0')) +
      (g.toString(16).padStart(2, '0')) +
      (b.toString(16).padStart(2, '0'));
  }

  // Add new method for clearing the canvas
  handleClearAll() {
    if (confirm('Are you sure you want to delete everything? This action cannot be undone.')) {
      // Clear all data
      this.nodes = [];
      this.edges = [];
      this.selectedNode = null;
      this.editingNode = null;
      this.tempEdgeStart = null;
      
      // Reset view
      this.offset = { x: 0, y: 0 };
      this.scale = 1;
      this.updateZoomLevel();
      
      // Hide text input if it's visible
      this.textInput.style.display = 'none';
      
      this.saveToLocalStorage();
      this.sidebar.update();
      this.needsRedraw = true;
    }
  }

  findEdgeAtPosition(pos) {
    return this.edgeRenderer.findEdgeAtPosition(pos);
  }

  updateNodeSize(node) {
    this.nodeRenderer.updateNodeSize(node);
  }

  checkNodeOverlap(node) {
    return this.nodeRenderer.checkNodeOverlap(node);
  }
}

// Initialize the mind map when the page loads
window.addEventListener('load', () => {
  new MindMap();
});

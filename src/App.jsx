import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { 
  MousePointer2, 
  Circle, 
  ArrowUpRight, 
  Type, 
  Image as ImageIcon,
  Download,
  Copy,
  ClipboardPaste,
  Trash2,
  Undo2,
  Redo2,
  Hand,
  Crop,
  Sparkles,
  Layers,
  Highlighter,
  PenTool,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import './App.css';

export default function App() {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [activeTool, setActiveTool] = useState('select');
  const [color, setColor] = useState('#ef4444');
  const [opacity, setOpacity] = useState(1);
  
  // Effects
  const [neonEffect, setNeonEffect] = useState(false);
  const [shadowEffect, setShadowEffect] = useState(true);
  const [textBgEffect, setTextBgEffect] = useState(false);
  const [outlineEffect, setOutlineEffect] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const [toastMessage, setToastMessage] = useState('');
  const [hasObjects, setHasObjects] = useState(false);
  
  const activeToolRef = useRef(activeTool);
  const colorRef = useRef(color);
  const opacityRef = useRef(opacity);
  const neonEffectRef = useRef(neonEffect);
  const shadowEffectRef = useRef(shadowEffect);
  const textBgEffectRef = useRef(textBgEffect);
  const outlineEffectRef = useRef(outlineEffect);
  const isLockedRef = useRef(isLocked);

  // Sync refs with state
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { opacityRef.current = opacity; }, [opacity]);
  useEffect(() => { neonEffectRef.current = neonEffect; }, [neonEffect]);
  useEffect(() => { shadowEffectRef.current = shadowEffect; }, [shadowEffect]);
  useEffect(() => { textBgEffectRef.current = textBgEffect; }, [textBgEffect]);
  useEffect(() => { outlineEffectRef.current = outlineEffect; }, [outlineEffect]);
  useEffect(() => { isLockedRef.current = isLocked; }, [isLocked]);

  const drawingState = useRef({
    isDrawing: false,
    isDragging: false,
    lastPosX: 0,
    lastPosY: 0,
    origX: 0,
    origY: 0,
    activeShape: null,
  });

  const history = useRef([]);
  const historyIndex = useRef(-1);
  const isHistoryProcessing = useRef(false);

  const saveHistory = () => {
    if (isHistoryProcessing.current || !fabricRef.current) return;
    const canvas = fabricRef.current;
    setHasObjects(canvas.getObjects().length > 0);
    const json = canvas.toJSON();
    history.current = history.current.slice(0, historyIndex.current + 1);
    history.current.push(json);
    historyIndex.current++;
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    // Initialize Fabric canvas
    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: 1920,
      height: 1080,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });
    
    fabricRef.current = initCanvas;
    saveHistory(); // initial state

    // Track history
    initCanvas.on('object:modified', saveHistory);

    // Handle Resize
    const resizeCanvas = () => {
      if (!containerRef.current || !fabricRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      fabricRef.current.setWidth(clientWidth);
      fabricRef.current.setHeight(clientHeight);
      fabricRef.current.renderAll();
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Setup Event Listeners
    initCanvas.on('mouse:wheel', function(opt) {
      var delta = opt.e.deltaY;
      var zoom = initCanvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      initCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    initCanvas.on('mouse:down', (o) => {
      const currentTool = activeToolRef.current;
      const currentColor = colorRef.current;
      const currentOpacity = opacityRef.current;
      
      const currentNeon = neonEffectRef.current;
      const currentShadow = shadowEffectRef.current;
      const currentTextBg = textBgEffectRef.current;
      const currentOutline = outlineEffectRef.current;

      if (currentTool === 'pan') {
        drawingState.current.isDragging = true;
        initCanvas.selection = false;
        drawingState.current.lastPosX = o.e.clientX;
        drawingState.current.lastPosY = o.e.clientY;
        return;
      }

      const pointer = initCanvas.getPointer(o.e);
      const { x, y } = pointer;
      drawingState.current.origX = x;
      drawingState.current.origY = y;

      if (currentTool === 'select') return;

      // Deselect all if we are not in select mode
      initCanvas.discardActiveObject();
      
      const getOutlineColor = (c) => c === '#ffffff' ? '#000000' : '#ffffff';
      
      let shadow = null;
      if (currentNeon) {
        shadow = new fabric.Shadow({ color: currentColor, blur: 15, offsetX: 0, offsetY: 0 });
      } else if (currentOutline && currentTool !== 'text') {
        shadow = new fabric.Shadow({ color: getOutlineColor(currentColor), blur: 5, offsetX: 0, offsetY: 0 });
      } else if (currentShadow) {
        shadow = new fabric.Shadow({ color: 'rgba(0,0,0,0.6)', blur: 4, offsetX: 3, offsetY: 3 });
      }

      if (currentTool === 'text') {
        const text = new fabric.IText('Ghi chú...', {
          left: x,
          top: y,
          fill: currentColor,
          opacity: currentOpacity,
          shadow: shadow,
          textBackgroundColor: currentTextBg ? 'rgba(0,0,0,0.5)' : null,
          stroke: currentOutline ? getOutlineColor(currentColor) : null,
          strokeWidth: currentOutline ? 2 : 0,
          fontFamily: 'Inter',
          fontSize: 32,
          fontWeight: 600,
          editable: true,
        });
        initCanvas.add(text);
        initCanvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        setActiveTool('select');
        saveHistory();
        return;
      }

      drawingState.current.isDrawing = true;

      if (currentTool === 'circle') {
        const circle = new fabric.Circle({
          left: x,
          top: y,
          radius: 1,
          strokeWidth: 4,
          stroke: currentColor,
          opacity: currentOpacity,
          shadow: shadow,
          fill: 'transparent',
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        drawingState.current.activeShape = circle;
        initCanvas.add(circle);
      } else if (currentTool === 'arrow') {
        const pathString = getArrowPath(x, y, x, y);
        const path = new fabric.Path(pathString, {
          stroke: currentColor,
          strokeWidth: 4,
          opacity: currentOpacity,
          shadow: shadow,
          fill: 'transparent',
          selectable: false,
          evented: false,
          objectCaching: false,
        });
        drawingState.current.activeShape = path;
        initCanvas.add(path);
      } else if (currentTool === 'crop') {
        const rect = new fabric.Rect({
          left: x,
          top: y,
          width: 0,
          height: 0,
          fill: 'rgba(0,0,0,0.3)',
          stroke: '#3b82f6',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
        });
        drawingState.current.activeShape = rect;
        initCanvas.add(rect);
      }
    });

    initCanvas.on('mouse:move', (o) => {
      const currentTool = activeToolRef.current;

      if (currentTool === 'pan' && drawingState.current.isDragging) {
        var e = o.e;
        var vpt = initCanvas.viewportTransform;
        vpt[4] += e.clientX - drawingState.current.lastPosX;
        vpt[5] += e.clientY - drawingState.current.lastPosY;
        initCanvas.requestRenderAll();
        drawingState.current.lastPosX = e.clientX;
        drawingState.current.lastPosY = e.clientY;
        return;
      }

      if (!drawingState.current.isDrawing) return;
      const pointer = initCanvas.getPointer(o.e);
      const { x, y } = pointer;
      const shape = drawingState.current.activeShape;
      const origX = drawingState.current.origX;
      const origY = drawingState.current.origY;

      if (currentTool === 'circle' && shape) {
        const radius = Math.max(Math.abs(origX - x), Math.abs(origY - y));
        shape.set({ radius: radius });
        initCanvas.renderAll();
      } else if (currentTool === 'arrow' && shape) {
        const pathString = getArrowPath(origX, origY, x, y);
        const parsedPath = fabric.util.parsePath(pathString);
        shape.set({ path: parsedPath });
        initCanvas.renderAll();
      } else if (currentTool === 'crop' && shape) {
        shape.set({ width: Math.abs(origX - x), height: Math.abs(origY - y) });
        shape.set({ left: Math.min(x, origX), top: Math.min(y, origY) });
        initCanvas.renderAll();
      }
    });

    initCanvas.on('mouse:up', () => {
      const currentTool = activeToolRef.current;
      
      if (currentTool === 'pan') {
        drawingState.current.isDragging = false;
        initCanvas.setViewportTransform(initCanvas.viewportTransform);
        return;
      }

      if (drawingState.current.isDrawing) {
        const shape = drawingState.current.activeShape;
        
        if (currentTool === 'crop' && shape) {
          if (shape.width > 10 && shape.height > 10) {
            shape.set({ visible: false });
            const croppedDataURL = initCanvas.toDataURL({
              format: 'png',
              left: shape.left,
              top: shape.top,
              width: shape.width,
              height: shape.height,
              multiplier: 2 // High res crop
            });
            initCanvas.clear(); // Complete wipe
            
            fabric.Image.fromURL(croppedDataURL, (img) => {
              img.set({ left: fabricRef.current.width / 2, top: fabricRef.current.height / 2, originX: 'center', originY: 'center' });
              initCanvas.add(img);
              initCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // reset view
              saveHistory();
              setActiveTool('select');
              showToast('Đã cắt ảnh!');
            });
          } else {
            initCanvas.remove(shape);
          }
        } else if (shape) {
          shape.set({ selectable: true, evented: true });
          shape.setCoords();
          saveHistory();
        }
      }
      drawingState.current.isDrawing = false;
      drawingState.current.activeShape = null;
    });
    
    // Keydown for deletion & undo/redo
    const handleKeyDown = (e) => {
      // Deletion
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjs = initCanvas.getActiveObjects();
        if (activeObjs.length) {
          if (initCanvas.getActiveObject()?.isEditing) return;
          activeObjs.forEach(obj => initCanvas.remove(obj));
          initCanvas.discardActiveObject();
          initCanvas.renderAll();
          saveHistory();
        }
      }
      
      // Undo (Ctrl+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndoCmd();
      }
      
      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedoCmd();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Paste event
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            fabric.Image.fromURL(event.target.result, (img) => {
              if (img.width > 1500) img.scaleToWidth(1500);
              img.set({
                left: fabricRef.current.width / 2,
                top: fabricRef.current.height / 2,
                originX: 'center',
                originY: 'center',
              });
              initCanvas.add(img);
              initCanvas.setActiveObject(img);
              setActiveTool('select');
              saveHistory();
              showToast('Đã dán ảnh!');
            });
          };
          reader.readAsDataURL(blob);
        }
      }
    };
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
      initCanvas.dispose();
    };
  }, []);

  const handleUndoCmd = () => {
    if (historyIndex.current > 0) {
      isHistoryProcessing.current = true;
      historyIndex.current--;
      fabricRef.current.loadFromJSON(history.current[historyIndex.current], () => {
        fabricRef.current.renderAll();
        isHistoryProcessing.current = false;
      });
    }
  };

  const handleRedoCmd = () => {
    if (historyIndex.current < history.current.length - 1) {
      isHistoryProcessing.current = true;
      historyIndex.current++;
      fabricRef.current.loadFromJSON(history.current[historyIndex.current], () => {
        fabricRef.current.renderAll();
        isHistoryProcessing.current = false;
      });
    }
  };

  // Effect to update selectability when tool changes or lock state changes
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.getObjects().forEach(obj => {
      obj.set({ 
        selectable: !isLocked && activeTool === 'select', 
        evented: !isLocked && activeTool === 'select',
        hoverCursor: (!isLocked && activeTool === 'select') ? 'move' : 'default' 
      });
    });
    if (activeTool !== 'select' || isLocked) canvas.discardActiveObject();
    canvas.defaultCursor = activeTool === 'pan' ? 'grab' : activeTool === 'crop' ? 'crosshair' : 'default';
    canvas.renderAll();
  }, [activeTool, isLocked]);

  // Effect to apply color changes to new and selected items
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const activeObj = canvas.getActiveObject();
    
    const getOutlineColor = (c) => c === '#ffffff' ? '#000000' : '#ffffff';

    if (activeObj) {
      if (activeObj.type === 'i-text') {
        activeObj.set({ 
          fill: color, 
          opacity,
          textBackgroundColor: textBgEffect ? 'rgba(0,0,0,0.5)' : null,
          stroke: outlineEffect ? getOutlineColor(color) : null,
          strokeWidth: outlineEffect ? 2 : 0
        });
      } else if (activeObj.type === 'circle' || activeObj.type === 'path') {
        activeObj.set({ stroke: color, opacity });
      } else if (activeObj.type === 'image') {
        activeObj.set({ opacity });
      }

      if (neonEffect) {
        activeObj.set('shadow', new fabric.Shadow({
          color: color,
          blur: 15,
          offsetX: 0,
          offsetY: 0
        }));
      } else if (outlineEffect && activeObj.type !== 'i-text' && activeObj.type !== 'image') {
        activeObj.set('shadow', new fabric.Shadow({
          color: getOutlineColor(color),
          blur: 5,
          offsetX: 0,
          offsetY: 0
        }));
      } else if (shadowEffect) {
        activeObj.set('shadow', new fabric.Shadow({
          color: 'rgba(0,0,0,0.6)',
          blur: 4,
          offsetX: 3,
          offsetY: 3
        }));
      } else {
        activeObj.set('shadow', null);
      }

      canvas.renderAll();
      saveHistory();
    }
  }, [color, opacity, neonEffect, shadowEffect, textBgEffect, outlineEffect]);

  const getArrowPath = (fromx, fromy, tox, toy) => {
    const angle = Math.atan2(toy - fromy, tox - fromx);
    const headlen = 20;
    return `M ${fromx} ${fromy} L ${tox} ${toy} M ${tox} ${toy} L ${tox - headlen * Math.cos(angle - Math.PI / 6)} ${toy - headlen * Math.sin(angle - Math.PI / 6)} M ${tox} ${toy} L ${tox - headlen * Math.cos(angle + Math.PI / 6)} ${toy - headlen * Math.sin(angle + Math.PI / 6)}`;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      fabric.Image.fromURL(event.target.result, (img) => {
        if (img.width > 1500) img.scaleToWidth(1500);
        img.set({
          left: fabricRef.current.width / 2,
          top: fabricRef.current.height / 2,
          originX: 'center',
          originY: 'center',
        });
        fabricRef.current.add(img);
        fabricRef.current.setActiveObject(img);
        setActiveTool('select');
        saveHistory();
        showToast('Đã tải ảnh lên!');
      });
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả bản vẽ không?')) {
      fabricRef.current.clear();
      saveHistory();
      setHasObjects(false);
      showToast('Đã xóa tất cả');
    }
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    const activeObjs = canvas.getActiveObjects();
    if (activeObjs.length) {
      activeObjs.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      saveHistory();
      showToast('Đã xóa đối tượng');
    }
  };

  const getHighQualityDataURL = () => {
    const canvas = fabricRef.current;
    if (canvas.getObjects().length === 0) {
      showToast('Không có gì để lưu!');
      return null;
    }
    
    const originalVpt = canvas.viewportTransform.slice(0);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    canvas.getObjects().forEach(obj => {
      const bound = obj.getBoundingRect();
      if (bound.left < minX) minX = bound.left;
      if (bound.top < minY) minY = bound.top;
      if (bound.left + bound.width > maxX) maxX = bound.left + bound.width;
      if (bound.top + bound.height > maxY) maxY = bound.top + bound.height;
    });

    canvas.setViewportTransform(originalVpt);

    minX = Math.max(-10000, minX - 20);
    minY = Math.max(-10000, minY - 20);
    maxX = maxX + 20;
    maxY = maxY + 20;

    const width = maxX - minX;
    const height = maxY - minY;

    if (width <= 0 || height <= 0) return null;

    return canvas.toDataURL({
      format: 'png',
      multiplier: 2,
      left: minX,
      top: minY,
      width: width,
      height: height,
    });
  };

  const handleDownload = () => {
    const dataURL = getHighQualityDataURL();
    if (!dataURL) return;
    const link = document.createElement('a');
    link.download = `notepic-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
    showToast('Đã tải xuống ảnh!');
  };

  const handleCopy = async () => {
    const dataURL = getHighQualityDataURL();
    if (!dataURL) return;
    try {
      const res = await fetch(dataURL);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showToast('Đã sao chép ảnh vào Clipboard!');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi sao chép ảnh');
    }
  };

  const handlePasteButton = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      let foundImage = false;
      for (const clipboardItem of clipboardItems) {
        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        for (const imageType of imageTypes) {
          const blob = await clipboardItem.getType(imageType);
          const reader = new FileReader();
          reader.onload = (event) => {
            fabric.Image.fromURL(event.target.result, (img) => {
              if (img.width > 1500) img.scaleToWidth(1500);
              img.set({
                left: fabricRef.current.width / 2,
                top: fabricRef.current.height / 2,
                originX: 'center',
                originY: 'center',
              });
              fabricRef.current.add(img);
              fabricRef.current.setActiveObject(img);
              setActiveTool('select');
              saveHistory();
              showToast('Đã dán ảnh!');
            });
          };
          reader.readAsDataURL(blob);
          foundImage = true;
        }
      }
      if (!foundImage) showToast('Không tìm thấy ảnh trong bộ nhớ tạm (clipboard)');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi đọc ảnh từ clipboard, vui lòng nhấn Ctrl+V.');
    }
  };

  const tools = [
    { id: 'select', icon: <MousePointer2 size={24} />, title: 'Chọn (Select)' },
    { id: 'pan', icon: <Hand size={24} />, title: 'Kéo xem ảnh (Pan)' },
    { id: 'crop', icon: <Crop size={24} />, title: 'Cắt vùng ảnh (Crop)' },
    { id: 'circle', icon: <Circle size={24} />, title: 'Khoanh tròn (Circle)' },
    { id: 'arrow', icon: <ArrowUpRight size={24} />, title: 'Mũi tên (Arrow)' },
    { id: 'text', icon: <Type size={24} />, title: 'Ghi chú (Text)' },
  ];

  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ffffff', '#000000'];

  return (
    <div className="app-container">
      {toastMessage && (
        <div className="toast">{toastMessage}</div>
      )}

      {/* Top Navigation */}
      <header className="top-bar glass">
        <div className="logo">
          <img src="/logo.png" alt="logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          NotePic
        </div>
        <div className="actions">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }} 
          />
          <button className="btn btn-icon" onClick={handleUndoCmd} title="Hoàn tác nét xóa/vẽ (Ctrl+Z)">
            <Undo2 size={20} />
          </button>
          <button className="btn btn-icon" onClick={handleRedoCmd} title="Tiếp tục (Ctrl+Y)">
            <Redo2 size={20} />
          </button>
          <button className="btn btn-icon" onClick={handleClearAll} title="Làm mới (Xóa tất cả)">
            <RefreshCw size={20} color="var(--danger)" />
          </button>

          <div className="tool-divider" style={{ width: '1px', height: '24px', background: 'var(--panel-border)', margin: '0 8px' }} />

          <button className="btn glass" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon size={20} />
            Tải ảnh lên
          </button>
          <button className="btn glass" onClick={handlePasteButton}>
            <ClipboardPaste size={20} />
            Dán ảnh (Ctrl+V)
          </button>
          <button className="btn btn-primary" onClick={handleCopy}>
            <Copy size={20} />
            Sao chép
          </button>
          <button className="btn btn-primary" onClick={handleDownload}>
            <Download size={20} />
            Tải xuống
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Floating Toolbar */}
        <aside className="toolbar glass" style={{ width: '220px' }}>
          
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>CÔNG CỤ</div>
          <div className="tool-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {tools.map(t => (
              <button 
                key={t.id}
                className={`btn-icon ${activeTool === t.id ? 'active' : ''}`}
                onClick={() => setActiveTool(t.id)}
                title={t.title}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {t.icon}
              </button>
            ))}
          </div>
          
          <div className="tool-divider" />
          
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>MÀU SẮC</div>
          <div className="tool-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', justifyItems: 'center' }}>
            {colors.map(c => (
              <div 
                key={c}
                className="color-picker-wrapper"
                style={{ backgroundColor: c, borderColor: color === c ? 'var(--text-main)' : 'transparent' }}
                onClick={() => setColor(c)}
                title="Chọn màu"
              />
            ))}
            <div 
              className="color-picker-wrapper" 
              style={{ 
                background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', 
                borderColor: !colors.includes(color) ? 'var(--text-main)' : 'transparent' 
              }}
              title="Màu tùy chỉnh (Custom / Eyedropper)"
            >
               <input 
                 type="color" 
                 value={color} 
                 onChange={(e) => setColor(e.target.value)} 
                 style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer', display: 'block' }} 
               />
            </div>
          </div>

          <div className="tool-divider" />

          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>HIỆU ỨNG</div>
          <div className="tool-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            <button 
              className={`btn-icon ${shadowEffect && !neonEffect ? 'active' : ''}`} 
              onClick={() => { setShadowEffect(!shadowEffect); if (neonEffect) setNeonEffect(false); }} 
              title="Đổ bóng để nổi bật công cụ vẽ (Drop Shadow)"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Layers size={20} />
            </button>
            <button 
              className={`btn-icon ${neonEffect ? 'active' : ''}`} 
              onClick={() => { setNeonEffect(!neonEffect); if (shadowEffect) setShadowEffect(false); }} 
              title="Hiệu ứng phát sáng màu (Neon Glow)"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Sparkles size={20} />
            </button>
            <button 
              className={`btn-icon ${textBgEffect ? 'active' : ''}`} 
              onClick={() => setTextBgEffect(!textBgEffect)} 
              title="Thêm nền cho chữ (Text Background)"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Highlighter size={20} />
            </button>
            <button 
              className={`btn-icon ${outlineEffect ? 'active' : ''}`} 
              onClick={() => { setOutlineEffect(!outlineEffect); if (neonEffect) setNeonEffect(false); }} 
              title="Thêm viền cho nét và chữ (Outline)"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <PenTool size={20} />
            </button>
          </div>

          <div className="tool-divider" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ĐỘ MỜ</label>
               <span style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>{Math.round(opacity * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0.1" max="1" step="0.1" 
              value={opacity} 
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="tool-divider" />

          <div className="tool-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button 
              className={`btn-icon ${isLocked ? 'active' : ''}`} 
              onClick={() => setIsLocked(!isLocked)} 
              title={isLocked ? "Mở khóa các đối tượng" : "Khóa đối tượng để không vô tình chạm vào"} 
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
              <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>{isLocked ? 'Đã khóa' : 'Khóa nền'}</span>
            </button>

            <button className="btn-icon" onClick={deleteSelected} title="Xóa vùng đang chọn (Delete/Backspace)" style={{ width: '100%', justifyContent: 'center' }}>
              <Trash2 size={20} color="var(--danger)" />
              <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginLeft: '0.5rem', fontWeight: 500 }}>Xóa vùng</span>
            </button>
          </div>
        </aside>

        {/* Canvas Area */}
        <div className="canvas-container" ref={containerRef}>
          {!hasObjects && (
            <div className="empty-placeholder">
              <ImageIcon size={64} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h2 style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 600 }}>Chưa có hình ảnh nào</h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '350px', lineHeight: 1.5 }}>
                Bạn có thể <span onClick={handlePasteButton} style={{ cursor: 'pointer', color: 'var(--text-main)', fontWeight: 600, textDecoration: 'underline' }}>Dán ảnh (Ctrl+V)</span> hoặc <span onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer', color: 'var(--text-main)', fontWeight: 600, textDecoration: 'underline' }}>Tải ảnh lên</span> để bắt đầu chỉnh sửa.
              </p>
            </div>
          )}
          <div className="canvas-wrapper">
            <canvas ref={canvasRef} />
          </div>
        </div>

      </main>
    </div>
  );
}

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image as ImageIcon, Grid } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface NonogramCell {
  filled: boolean;
  color: string;
}

interface RowNumbers {
  numbers: number[];
}

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [columns, setColumns] = useState<number>(15);
  const [rows, setRows] = useState<number>(15);
  const [nonogramGrid, setNonogramGrid] = useState<NonogramCell[][]>([]);
  const [rowNumbers, setRowNumbers] = useState<number[][]>([]);
  const [columnNumbers, setColumnNumbers] = useState<number[][]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nonogramRef = useRef<HTMLDivElement>(null);

  const calculateNumbers = (grid: NonogramCell[][]) => {
    // Calculate row numbers
    const rowNums = grid.map(row => {
      const numbers: number[] = [];
      let currentCount = 0;
      
      row.forEach((cell, index) => {
        if (cell.filled) {
          currentCount++;
          if (index === row.length - 1) {
            numbers.push(currentCount);
          }
        } else if (currentCount > 0) {
          numbers.push(currentCount);
          currentCount = 0;
        }
      });
      
      return numbers.length ? numbers : [0];
    });

    // Calculate column numbers
    const colNums = Array(grid[0].length).fill(0).map((_, colIndex) => {
      const numbers: number[] = [];
      let currentCount = 0;
      
      grid.forEach((row, rowIndex) => {
        if (row[colIndex].filled) {
          currentCount++;
          if (rowIndex === grid.length - 1) {
            numbers.push(currentCount);
          }
        } else if (currentCount > 0) {
          numbers.push(currentCount);
          currentCount = 0;
        }
      });
      
      return numbers.length ? numbers : [0];
    });

    setRowNumbers(rowNums);
    setColumnNumbers(colNums);
  };

  const generateNonogram = useCallback((imgElement: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = columns;
        canvas.height = rows;
        
        // Clear the canvas first
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scaling to maintain aspect ratio
        const scale = Math.min(
          canvas.width / imgElement.width,
          canvas.height / imgElement.height
        );
        
        const scaledWidth = imgElement.width * scale;
        const scaledHeight = imgElement.height * scale;
        
        // Center the image
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(
          imgElement,
          x, y,
          scaledWidth, scaledHeight
        );
        
        const imageData = ctx.getImageData(0, 0, columns, rows);
        
        // Convert to nonogram grid
        const grid: NonogramCell[][] = [];
        for (let y = 0; y < rows; y++) {
          const row: NonogramCell[] = [];
          for (let x = 0; x < columns; x++) {
            const i = (y * columns + x) * 4;
            const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
            row.push({
              filled: brightness < 128,
              color: `rgb(${imageData.data[i]}, ${imageData.data[i + 1]}, ${imageData.data[i + 2]})`
            });
          }
          grid.push(row);
        }
        setNonogramGrid(grid);
        calculateNumbers(grid);
      }
    }
  }, [columns, rows]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Set initial rows based on aspect ratio if this is the first upload
          if (!image) {
            const aspectRatio = img.height / img.width;
            setRows(Math.round(columns * aspectRatio));
          }
          generateNonogram(img);
        };
        img.src = e.target?.result as string;
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const exportAsPNG = useCallback(async () => {
    if (nonogramRef.current) {
      const canvas = await html2canvas(nonogramRef.current);
      const link = document.createElement('a');
      link.download = 'nonogram.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  }, []);

  const exportAsPDF = useCallback(async () => {
    if (nonogramRef.current) {
      const canvas = await html2canvas(nonogramRef.current);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('nonogram.pdf');
    }
  }, []);

  // Regenerate nonogram when dimensions change
  React.useEffect(() => {
    if (image) {
      const img = new Image();
      img.onload = () => generateNonogram(img);
      img.src = image;
    }
  }, [columns, rows, generateNonogram, image]);

  const maxRowNumbersLength = Math.max(...rowNumbers.map(arr => arr.length));
  const maxColumnNumbersLength = Math.max(...columnNumbers.map(arr => arr.length));

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <Grid className="w-8 h-8" />
            Nonogram Generator
          </h1>

          <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600 transition">
                <Upload className="w-5 h-5" />
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-gray-700">Columns:</label>
                  <input
  type="number"
  min={1}
  step={1}
  value={columns}
  onChange={(e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setColumns(Math.max(5, Math.min(50, value)));
    }
  }}
  className="w-20 px-2 py-1 border rounded"
  min="5"
  max="50"
/>

                <div className="flex items-center gap-2">
                  <label className="text-gray-700">Rows:</label>
                  <input
  type="number"
  min={1}
  step={1}
  value={rows}
  onChange={(e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setRows(Math.max(5, Math.min(50, value)));
    }
  }}
  className="w-20 px-2 py-1 border rounded"
  min="5"
  max="50"
/>
                </div>
              </div>

              {nonogramGrid.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={exportAsPNG}
                    className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                  >
                    <ImageIcon className="w-5 h-5" />
                    Export PNG
                  </button>
                  <button
                    onClick={exportAsPDF}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    <Download className="w-5 h-5" />
                    Export PDF
                  </button>
                </div>
              )}
            </div>

            {/* Preview */}
            {image && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h2 className="text-xl font-semibold mb-4">Original Image</h2>
                <img src={image} alt="Preview" className="max-h-64 object-contain mx-auto" />
              </div>
            )}

            {/* Nonogram Grid */}
            {nonogramGrid.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h2 className="text-xl font-semibold mb-4">Nonogram</h2>
                <div ref={nonogramRef} className="inline-block bg-white p-4">
                  {/* Column numbers */}
                  <div className="flex">
                    <div style={{ width: maxRowNumbersLength * 24 + 'px' }} className="flex-none"></div>
                    <div className="flex-1 border-b border-gray-300">
                      {columnNumbers.map((numbers, x) => (
                        <div key={x} className="inline-block align-bottom border-r border-gray-300" style={{ width: '24px', height: maxColumnNumbersLength * 24 + 'px' }}>
                          <div className="h-full flex flex-col-reverse">
                            {numbers.map((num, i) => (
                              <div key={i} className="h-6 flex items-center justify-center text-sm font-medium text-gray-700 bg-gray-50">
                                {num}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grid with row numbers */}
                  <div className="flex">
                    {/* Row numbers */}
                    <div style={{ width: maxRowNumbersLength * 24 + 'px' }} className="flex-none border-r border-gray-300">
                      {rowNumbers.map((numbers, y) => (
                        <div key={y} className="h-6 flex items-center justify-end border-b border-gray-300">
                          {numbers.map((num, i) => (
                            <div key={i} className="w-6 h-6 flex items-center justify-center text-sm font-medium text-gray-700 bg-gray-50">
                              {num}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Grid */}
                    <div>
                      {nonogramGrid.map((row, y) => (
                        <div key={y} className="flex h-6">
                          {row.map((cell, x) => (
                            <div
                              key={`${x}-${y}`}
                              className={`w-6 h-6 border-r border-b border-gray-300 ${cell.filled ? 'bg-gray-800' : 'bg-white'}`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

export default App;

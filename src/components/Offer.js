import React, { useState } from 'react';
import { Upload, Send, CheckCircle, AlertCircle } from 'lucide-react';

const OfferLetterGenerator = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const processCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csvText = event.target.result;
          const rows = csvText.split('\n');
          
          // Get headers and clean them
          const headers = rows[0].split(',').map(header => 
            header.trim()
              .toLowerCase()
              .replace(/\r/g, '')  // Remove carriage returns
          );

          // Process each row
          const data = [];
          for(let i = 1; i < rows.length; i++) {
            if(rows[i].trim() === '') continue; // Skip empty rows
            
            const values = rows[i].split(',').map(val => val.trim().replace(/\r/g, ''));
            if(values.length === headers.length) {
              const row = {};
              headers.forEach((header, index) => {
                row[header] = values[index];
              });
              data.push(row);
            }
          }

          if(data.length === 0) {
            reject(new Error('No valid data found in CSV file'));
          }

          resolve(data);
        } catch (error) {
          reject(new Error('Error parsing CSV file: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Validate file type
      if (!file.name.endsWith('.csv')) {
        throw new Error('Please upload a CSV file');
      }

      setFile(file);
      const data = await processCSVFile(file);
      setPreview(data);
      setStatus({
        type: 'success',
        message: `Successfully loaded ${data.length} records`
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message
      });
      setFile(null);
      setPreview([]);
    }
  };

  const processOfferLetters = async () => {
    setIsProcessing(true);
    setStatus({ type: 'info', message: 'Processing offer letters...' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://mailsender-7.onrender.com/api/generate-letters', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate offer letters');
      }

      const result = await response.json();
      
      // Send emails automatically
      const emailResponse = await fetch('https://mailsender-7.onrender.com/api/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: result.files }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send emails');
      }

      const emailResult = await emailResponse.json();
      setStatus({
        type: 'success',
        message: `Successfully generated and sent ${emailResult.sent} offer letters!`
      });

    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Error processing offer letters'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
            <Send className="w-6 h-6" />
            Offer Letter Generator
          </h1>

          {/* File Upload */}
          <div className="mb-8">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors rounded-lg p-4"
              >
                <Upload className="w-12 h-12 text-gray-400" />
                <span className="text-lg font-medium">
                  {file ? file.name : 'Upload CSV file'}
                </span>
                <span className="text-sm text-gray-500">
                  Drag and drop or click to select
                </span>
              </label>
            </div>
          </div>

          {/* Status Alert */}
          {status.message && (
            <div className={`mb-6 p-4 rounded-lg ${
              status.type === 'error' ? 'bg-red-50 text-red-700' :
              status.type === 'success' ? 'bg-green-50 text-green-700' :
              'bg-blue-50 text-blue-700'
            } flex items-center gap-2`}>
              {status.type === 'error' ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              ) : status.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <Send className="w-5 h-5 flex-shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {/* Data Preview Table */}
          {preview.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
              <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 border-separate" style={{ borderSpacing: '0 15px' }}>
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).map((header, index) => (
                        <th 
                          key={index}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          style={{ padding: '15px', borderBottom: '2px solid #ddd' }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {preview.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {Object.values(row).map((value, cellIndex) => (
                          <td 
                            key={cellIndex}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            style={{ padding: '15px', borderBottom: '2px solid #ddd' }}
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={processOfferLetters}
            disabled={!file || isProcessing}
            className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors
              ${!file || isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Processing...
              </span>
            ) : (
              'Generate & Send Offer Letters'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfferLetterGenerator;

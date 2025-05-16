import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@mui/material';
import axios from 'axios';
import Loader from './loader'

const serverUrl = process.env.REACT_APP_SERVER_URL;

function InventoryStore() {

  const initialState = {
    totalSku: 0,
    startTimeDb: '',
    updatedSkuDb: 0,
    failedSkuDb: [],
    endTimeDb: '',
    startTimeStore: '',
    updatedSkuStore: 0,
    failedSkuStore: 0,
    endTimeStore: ''
  }

  const currentState = JSON.parse(localStorage.getItem('notificationState'));

  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [notification, setNotification] = useState(currentState !== null && currentState !== undefined ? currentState : initialState);

  const getInventoryHistory = async () => {
    try {
      const response = await axios.get(`${serverUrl}/api/get-inventory-history`);
      setInventoryHistory(response.data)
    } catch (error) {
      console.log(error)
    }
  }
  
  useEffect(() => {
    // Establish the connection when the component mounts
    const eventSource = new EventSource(`${serverUrl}/api/inventory-events`);

    eventSource.onmessage = function (event) {
      const newData = JSON.parse(event.data);
      setNotification(prev => ({ ...prev, ...newData.result }));
      localStorage.setItem('notificationState', JSON.stringify(newData.result));
      if (newData.message === 'All Shopify Batch processed') {
        setTimeout(() => {
          getInventoryHistory()
        })
        setNotification(initialState)
        localStorage.setItem('notificationState', JSON.stringify(initialState));
      }
    };

    eventSource.onerror = function (error) {
      // Handle errors
      console.error('EventSource failed:', error);
      eventSource.close();
    };

    // Cleanup on component unmount
    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {

  }, [notification]);

  useEffect(() => {
    getInventoryHistory()
  }, [])

  const saveFreshInventory = async () => {
    try {
      const response = await axios.get(`${serverUrl}/api/fresh-inventory`);
      console.log(response);
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  };

  function formatDateAndTime(date) {
    const d = new Date(date);
    const dateOptions = { year: '2-digit', month: 'short', day: '2-digit' };
    const formattedDate = d.toLocaleDateString('en-GB', dateOptions).replace(/ /g, '-');
    const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
    const formattedTime = d.toLocaleTimeString('en-US', timeOptions);
    return [formattedDate, formattedTime];
  }

  const cardDesign = {
    borderRadius: '5px',
    boxShadow: 'rgba(17, 17, 26, 0.05) 0px 1px 0px, rgba(17, 17, 26, 0.1) 0px 0px 8px',
    padding: '20px',
    marginTop: '20px'
  }

  const rowDesignh = {
    padding: '3px 0',
    height: '40px',
    display: 'grid',
    gridTemplateColumns: '3fr 1fr 1fr 2fr 2fr'
  }

  const rowDesign = {
    padding: '3px 0',
    height: '35px',
    display: 'grid',
    gridTemplateColumns: '3fr 1fr 1fr 2fr 2fr'
  }

  const downloadFailedSkus = (failedSkus, index) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "S.No.,SKU\n";
    failedSkus.forEach((sku, index) => {
      csvContent += `${index + 1},${sku}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `failed_skus_list_${index}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ padding: '15px 10px', maxWidth: '1200px', margin: 'auto' }}>
      <Button onClick={saveFreshInventory} variant='contained' sx={{ marginBottom: '10px' }} disabled={notification?.startTimeDb !== '' ?true:false}>
        Update Inventory
      </Button>
      {
        notification.startTimeDb !== '' && notification.endTimeStore === '' ? (
          <div style={cardDesign}>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr style={rowDesignh}>
                  <td style={{ fontWeight: '700', fontSize: '18px' }}>Total Products</td>
                  <td style={{ fontWeight: '700', fontSize: '18px' }}>{notification.totalSku}</td>
                  <td></td>
                  <td></td>
                  <td style={{ display: 'flex', alignItems: 'center', color: 'rgb(25 118 210 / 78%)', fontWeight: '500', justifyContent: 'end' }}>Inventory Sync is running<Loader /></td>
                </tr>
                <tr style={rowDesign}>
                  <td></td>
                  <td style={{ fontWeight: '600' }}>Success</td>
                  <td style={{ fontWeight: '600' }}>Failed</td>
                  <td style={{ fontWeight: '600' }}>Start Time</td>
                  <td style={{ fontWeight: '600' }}>End Time</td>
                </tr>
                <tr style={rowDesign}>
                  <td>Inventory Sync From 3rd Party</td>
                  <td>{notification.updatedSkuDb}</td>
                  <td>{notification.failedSkuDb.length}</td>
                  <td>
                    {notification.startTimeDb !== ''
                      ? `${formatDateAndTime(notification.startTimeDb)[0]} (${formatDateAndTime(notification.startTimeDb)[1]})`
                      : '-'}
                  </td>
                  <td>
                    {notification.endTimeDb !== ''
                      ? `${formatDateAndTime(notification.endTimeDb)[0]} (${formatDateAndTime(notification.endTimeDb)[1]})`
                      : '-'}
                  </td>
                </tr>
                <tr style={rowDesign}>
                  <td>Shopify Inventory Update</td>
                  <td>{notification.updatedSkuStore}</td>
                  <td>{notification.failedSkuStore}</td>
                  <td>
                    {notification.startTimeStore !== ''
                      ? `${formatDateAndTime(notification.startTimeStore)[0]} (${formatDateAndTime(notification.startTimeStore)[1]})`
                      : '-'}
                  </td>
                  <td>
                    {notification.endTimeStore !== ''
                      ? `${formatDateAndTime(notification.endTimeStore)[0]} (${formatDateAndTime(notification.endTimeStore)[1]})`
                      : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'end' }}>
              {notification.failedSkuDb.length > 0 &&
                <button onClick={() => downloadFailedSkus(notification.failedSkuDb, 1)} style={{ borderWidth: '0 0 1px 0', borderBottomColor: 'rgb(25 118 210 / 78%)', background: 'transparent', height: '23px' }}>
                  Download Failed (SKUs)
                </button>
              }
            </div>
          </div>
        ) : ''
      }


      {
        inventoryHistory?.length > 0 && inventoryHistory.map((history, index) => (
          <div style={cardDesign} key={index}>
            <table style={{ width: '100%' }}>
              <tbody>
                <tr style={rowDesignh}>
                  <td style={{ fontWeight: '700', fontSize: '18px' }}>Total Products</td>
                  <td style={{ fontWeight: '700', fontSize: '18px' }}>{history.totalSku}</td>
                  <td></td>
                  <td></td>
                  <td style={{ display: 'flex', alignItems: 'center', color: 'rgb(25 118 210 / 78%)', fontWeight: '500', justifyContent: 'end', marginRight: '26px' }}>Inventory Sync completed.</td>
                </tr>
                <tr style={rowDesign}>
                  <td></td>
                  <td style={{ fontWeight: '600' }}>Success</td>
                  <td style={{ fontWeight: '600' }}>Failed</td>
                  <td style={{ fontWeight: '600' }}>Start Time</td>
                  <td style={{ fontWeight: '600' }}>End Time</td>
                </tr>
                <tr style={rowDesign}>
                  <td>Inventory Sync From 3rd Party</td>
                  <td>{history.updatedSkuDb}</td>
                  <td>{history.failedSkuDb.length}</td>
                  <td>
                    {history.startTimeDb !== ''
                      ? `${formatDateAndTime(history.startTimeDb)[0]} (${formatDateAndTime(history.startTimeDb)[1]})`
                      : '-'}
                  </td>
                  <td>
                    {history.endTimeDb !== ''
                      ? `${formatDateAndTime(history.endTimeDb)[0]} (${formatDateAndTime(history.endTimeDb)[1]})`
                      : '-'}
                  </td>
                </tr>
                <tr style={rowDesign}>
                  <td>Shopify Inventory Update</td>
                  <td>{history.updatedSkuStore}</td>
                  <td>{history.failedSkuStore}</td>
                  <td>
                    {history.startTimeStore !== ''
                      ? `${formatDateAndTime(history.startTimeStore)[0]} (${formatDateAndTime(history.startTimeStore)[1]})`
                      : '-'}
                  </td>
                  <td>
                    {history.endTimeStore !== ''
                      ? `${formatDateAndTime(history.endTimeStore)[0]} (${formatDateAndTime(history.endTimeStore)[1]})`
                      : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'end' }}>
              {history.failedSkuDb.length > 0 &&
                <button onClick={() => downloadFailedSkus(history.failedSkuDb, 1)} style={{ borderWidth: '0 0 1px 0', borderBottomColor: 'rgb(25 118 210 / 78%)', background: 'transparent', height: '23px' }}>
                  Download Failed (SKUs)
                </button>
              }
            </div>
          </div>
        ))
      }
    </div>
  );
}

export default InventoryStore;

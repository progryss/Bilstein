import React, { useState, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import RowDetails from "./rowDetails";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import AddRow from "./addRow";
import { useProgressToast } from "./customHooks/useProgressToast";
import Loader from "./loader";

import DeleteIcon from "@mui/icons-material/Delete";
import SyncIcon from "@mui/icons-material/Sync";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveAltIcon from "@mui/icons-material/SaveAlt";

const serverUrl = process.env.REACT_APP_SERVER_URL;

const rowsPerPage = 100;

export default function Dashboard() {
  const { showProgressToast, updateProgress, finalizeToast, setProgress } =
    useProgressToast();
  const navigate = useNavigate();

  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState({});
  const [rowPopop, setRowPopop] = useState(null);
  const [trigerUseeffectByDelete, setTrigerUseeffectByDelete] = useState(false);
  const tableHeaderRef = useRef(null);
  const [file, setFile] = useState(null);
  const [refreshData, setRefreshData] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(1);

  const [modelOpen, setModelOpen] = React.useState(false);
  const handleCloseModel = () => setModelOpen(false);
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [searchString, setSearchString] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchCsvData(page) {
      const url = `${serverUrl}/api/csv-data?page=${page}&limit=${rowsPerPage}&search=${search}`;
      if (search !== "") {
        setIsLoading(true);
      }
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        const json = await response.json();
        if (response.ok) {
          const data = json.data;
          setTotalPages(json.totalPages);
          setTotalRows(json.total);
          if (data.length > 0) {
            const keys = Object.keys(data[0])?.filter(
              (key) => key !== "_id" && key !== "__v"
            );
            const initialColumns = [
              { id: "serialNumber", title: "Sr No." },
              { id: "selectAll", title: "Select All" },
              { id: "manufacturer", title: "Manufacturer" },
              { id: "year", title: "Year" },
              { id: "model", title: "Model" },
              { id: "subModel", title: "Sub Model" },
              { id: "engine", title: "Engine" },
              { id: "bhp", title: "Bhp" },
              { id: "body", title: "Body" },
              { id: "startEndDate", title: "StartEnd Date" },
              { id: "engineCode", title: "Engine Code" },
              { id: "v8_Transmission_Gears", title: "V8 Transmission Gears" },
              { id: "partNo", title: "Part No" },
              { id: "suspension_A", title: "Suspension A" },
              { id: "transmissionType_A", title: "Transmission Type A" },
              { id: "type_A", title: "Type A" },
              { id: "vehicleEquipment_A", title: "Vehicle Equipment A" },
              { id: "chassisNumberFrom_A", title: "Chassis Number From A" },
            ];
            const savedColumns = JSON.parse(localStorage.getItem("columns"));
            if (savedColumns) {
              setColumns(savedColumns);
            } else {
              setColumns(initialColumns);
            }
            const rowData = data.map((item, index) => ({
              ...item,
              originalIndex: index,
            }));
            const enrichedData = [...rowData];
            setApiKeys(keys);
            setData(enrichedData);
            setFilteredResults(enrichedData);
          } else {
            const rowData = data.map((item, index) => ({
              ...item,
              originalIndex: index,
            }));
            const enrichedData = [...rowData];
            setData(enrichedData);
            setFilteredResults(enrichedData);
            setSelectAll(false);
          }
        }
        if (search !== "") {
          setIsLoading(false);
        }
      } catch (err) {
        console.log(err, "Error in Getting Members");
        navigate("/login");
      }
      const savedWidths = JSON.parse(localStorage.getItem("columnWidths"));
      if (savedWidths) {
        setColumnWidths(savedWidths);
      }
    }
    fetchCsvData(currentPage);
  }, [
    currentPage,
    navigate,
    rowPopop,
    trigerUseeffectByDelete,
    refreshData,
    search,
  ]);

  // column drag
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const updatedColumns = Array.from(columns);
    const [reorderedColumn] = updatedColumns?.splice(result.source.index, 1);
    if (result?.source?.index !== 0 && result?.source?.index !== 1) {
      updatedColumns.splice(result?.destination?.index, 0, reorderedColumn);
    }
    setColumns(updatedColumns);
    localStorage.setItem("columns", JSON.stringify(updatedColumns));
  };

  // column toggle in sheet
  const handleToggleColumn = (key) => {
    const columnExists = columns?.find((column) => column.id === key);
    let updatedColumns;
    if (columnExists) {
      updatedColumns = columns?.filter((column) => column.id !== key);
    } else {
      const newColumn = {
        id: key,
        title: key.charAt(0).toUpperCase() + key.slice(1),
      };
      updatedColumns = [...columns, newColumn];
    }
    setColumns(updatedColumns);
    localStorage.setItem("columns", JSON.stringify(updatedColumns));
  };

  const isDate = (value) => {
    return !isNaN(Date.parse(value));
  };

  // sheet row short
  const handleSort = (columnId) => {
    let direction = "ascending";
    if (sortConfig.key === columnId && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key: columnId, direction });

    const sortedData = [...data].sort((a, b) => {
      let aValue = a[columnId];
      let bValue = b[columnId];

      // Check if the values are dates
      if (isDate(aValue) && isDate(bValue)) {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) {
        return direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === "ascending" ? 1 : -1;
      }
      return 0;
    });

    setData(sortedData);
    setFilteredResults(sortedData);
  };

  // column resize
  const handleResize = (columnId, width) => {
    const updatedWidths = {
      ...columnWidths,
      [columnId]: width,
    };
    setColumnWidths(updatedWidths);
    localStorage.setItem("columnWidths", JSON.stringify(updatedWidths));
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setSelectedRows(newSelectAll ? filteredResults.map((row) => row._id) : []);
  };

  const handleSelectRow = (id) => {
    const newSelectedRows = selectedRows.includes(id)
      ? selectedRows.filter((rowId) => rowId !== id)
      : [...selectedRows, id];
    setSelectedRows(newSelectedRows);
    setSelectAll(newSelectedRows.length === data.length);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const deleteRowFromTable = async () => {
    // console.log(selectedRows);
    let userResponseText =
      selectedRows.length === 0
        ? "No data Selected"
        : `Are you sure you want to delete ${selectedRows.length} Rows ?`;
    const userResponse = window.confirm(userResponseText);
    if (userResponse) {
      const toastId = showProgressToast(`Deleting ${selectedRows.length} rows`);
      updateProgress(toastId, "loader", `Deleting ${selectedRows.length} rows`);
      try {
        await axios.delete(`${serverUrl}/api/delete-rows`, {
          headers: {
            "Content-Type": "application/json",
          },
          data: { ids: selectedRows },
        });
        setSelectAll(false);
        setTrigerUseeffectByDelete(!trigerUseeffectByDelete);
        finalizeToast(
          toastId,
          true,
          `${selectedRows.length} rows deleted Successfully`
        );
      } catch (error) {
        console.error("Error:", error);
        finalizeToast(toastId, false, `Error in deleting selected rows `);
      }
    }
    setSelectedRows([]);
  };

  const syncProduct = async () => {
    const toastId = showProgressToast("syncing Shopify Products");
    updateProgress(toastId, "loader", "syncing Shopify Products");
    try {
      await axios.post(`${serverUrl}/api/sync-products`, {
        headers: { "Content-Type": "application/json" },
        timeout: 180000,
      });
      finalizeToast(toastId, true, "All Products Sync.");
    } catch (error) {
      console.error("Error saving products:", error);
      finalizeToast(toastId, false, "", "Failed to Sync Products.");
    }
  };

  const deleteProduct = async () => {
    const userResponse = window.confirm("Are you sure you want to delete?");
    if (!userResponse) return;
    const toastId = showProgressToast("Deleting Shopify Products");
    updateProgress(toastId, "loader", "Deleting Shopify Products");
    try {
      let response = await axios.post(`${serverUrl}/api/delete-products`);
      finalizeToast(toastId, true, "All Products Deleted.");
    } catch (error) {
      console.error("Error deleting products:", error);
      finalizeToast(toastId, false, "", "Failed to delete Products.");
    }
  };

  const fileInputRef = React.useRef();

  function updateProgressBar(toastId) {
    const progressInterval = setInterval(async () => {
      const response = await fetch(`${serverUrl}/api/upload/progress`);
      const data = await response.json();

      if (!data.totalBatches) {
        // Ensure total is not zero or undefined to avoid division by zero
        console.error("Total number of records is zero or not defined.");
        clearInterval(progressInterval);
        finalizeToast(toastId, false, "Failed to fetch progress");
        return;
      }

      const percentage = (data.progress / data.totalBatches) * 100;
      setProgress(percentage);
      updateProgress(toastId, percentage, "Uploading CSV");
      if (percentage >= 100) {
        clearInterval(progressInterval);
        finalizeToast(toastId, true, `${data.totalRecords} Records uploaded !`);
        setTrigerUseeffectByDelete(!trigerUseeffectByDelete);
      }
    }, 3000);
  }

  const handleUploadCsv = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("csvFile", file);

    setProgress(0); // Reset progress at the start
    const toastId = showProgressToast("Uploading CSV");

    try {
      const response = await fetch(`${serverUrl}/api/upload-csv`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        updateProgressBar(toastId);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Clear file input field
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to upload file: ${errorText}`);
      }
    } catch (error) {
      finalizeToast(
        toastId,
        false,
        "",
        "Failed to upload CSV ! Required column is missing in CSV (Make, Model, Engine Type, Year). "
      );
      console.error("Error uploading file:", error);
    }
  };

  const deleteCsvData = async () => {
    const userResponse = window.confirm("Are you sure you want to delete?");
    if (!userResponse) return;
    const toastId = showProgressToast("Deleting CSV data");
    updateProgress(toastId, "loader", "Deleting CSV data");
    try {
      await fetch(`${serverUrl}/api/delete-csv`, {
        method: "POST",
      });
      refreshIt();
      finalizeToast(toastId, true, "CSV Data Deleted.");
    } catch (error) {
      console.error("Error in deleting Csv data", error);
      finalizeToast(toastId, false, "", "Failed to delete Csv data.");
    }
  };

  const refreshIt = () => {
    setRefreshData(!refreshData);
  };

  // pagination buttons
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    window.scrollTo({
      top: tableHeaderRef.current.offsetTop,
      behavior: "smooth",
    });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    window.scrollTo({
      top: tableHeaderRef.current.offsetTop,
      behavior: "smooth",
    });
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    pageNumbers.push(1);
    if (currentPage > 3) {
      pageNumbers.push("...");
    }
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    if (currentPage < totalPages - 2) {
      pageNumbers.push("...");
    }
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };

  function capitalizeWords(str) {
    return str.toLowerCase().replace(/(?:^|\s)\S/g, function (a) {
      return a.toUpperCase();
    });
  }

  const deleteDuplicateCsv = async () => {
    const userResponse = window.confirm("Are you sure you want to delete?");
    if (!userResponse) return;
    const toastId = showProgressToast("Deleting Duplicates");
    updateProgress(toastId, "loader", "Deleting Duplicates");
    try {
      const response = await axios.delete(
        `${serverUrl}/api/remove-duplicateCsv`
      );
      if (response.status === 200) {
        refreshIt();
        finalizeToast(toastId, true, response.data);
      }
    } catch (error) {
      console.log("error in removing duplicate csv");
      finalizeToast(toastId, false, "", "Failed to delete Csv Duplicates.");
    }
  };

  const clearAllCaches = async () => {
    const userResponse = window.confirm("Are you sure you want to clear?");
    if (!userResponse) return;
    const toastId = showProgressToast("Deleting Cache");
    updateProgress(toastId, "loader", "Deleting Cache");
    try {
      const response = await axios.delete(`${serverUrl}/api/flush-all`);
      if (response.status === 200) {
        finalizeToast(toastId, true, response.data);
      }
    } catch (error) {
      console.log("error in deleting cache");
      finalizeToast(toastId, false, "", "Failed to delete Cache.");
    }
  };

  return (
    <>
      <div className="container-fluid customer-container">
        <div className="card card-block border-0 customer-table-css-main">
          <div className="card-body p-0">
            <div className="py-3 bg-light add-cutomer-section">
              <div className="row searchParentWrapper">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control bg-custom border-end-0 search-input"
                    placeholder="Search"
                    value={searchString}
                    onChange={(e) => setSearchString(e.target.value)}
                  />
                  <div className="input-group-append">
                    {isLoading ? (
                      <button
                        className="btn border search-icon-custom"
                        type="button"
                        style={{ height: "100%", cursor: "wait" }}
                      >
                        <Loader />
                      </button>
                    ) : (
                      <button
                        className="btn border search-icon-custom"
                        type="button"
                        style={{ height: "100%" }}
                        onClick={() => setSearch(searchString)}
                      >
                        <i className="fa fa-search"></i>
                      </button>
                    )}

                    <RefreshIcon
                      sx={{ cursor: "pointer", marginLeft: "10px" }}
                      onClick={() => {
                        setSearch("");
                        setSearchString("");
                      }}
                    />
                  </div>
                </div>
                <div className="d-flex">
                  <div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="importCompany"
                    />
                    <Button
                      variant="contained"
                      onClick={handleUploadCsv}
                      className="me-2"
                    >
                      <SaveAltIcon
                        fontSize="small"
                        sx={{ position: "relative", left: "-6px" }}
                      />{" "}
                      Import CSV
                    </Button>
                  </div>
                  <Button
                    variant="contained"
                    onClick={deleteCsvData}
                    className="me-2"
                  >
                    <DeleteIcon
                      sx={{ position: "relative", left: "-6px" }}
                      fontSize="small"
                    />{" "}
                    Delete All CSV Data
                  </Button>
                  <Button
                    className="me-2"
                    onClick={syncProduct}
                    variant="contained"
                  >
                    <SyncIcon
                      sx={{ position: "relative", left: "-6px" }}
                      fontSize="small"
                    />{" "}
                    Sync Shopify Products
                  </Button>
                  <Button
                    variant="contained"
                    className="me-2"
                    onClick={deleteProduct}
                  >
                    <DeleteIcon
                      sx={{ position: "relative", left: "-6px" }}
                      fontSize="small"
                    />{" "}
                    Delete Shopify Products
                  </Button>
                  <div className="dropdown">
                    <button
                      className="btn btn-primary ml-3 dropdown-toggle text-nowrap"
                      type="button"
                      id="dropdownMenuButton"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      style={{ height: "100%" }}
                    >
                      <AddIcon fontSize="small" /> Add Column
                    </button>
                    <ul
                      className="dropdown-menu addCol"
                      aria-labelledby="dropdownMenuButton"
                    >
                      {apiKeys.map((key) => (
                        <li key={key}>
                          <label className="dropdown-item">
                            <input
                              type="checkbox"
                              onChange={() => handleToggleColumn(key)}
                              checked={columns.some(
                                (column) => column.id === key
                              )}
                            />{" "}
                            {key === "sku"
                              ? "Part No"
                              : key === "included"
                              ? "Kit Components"
                              : key}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Button
                variant="contained"
                onClick={handleOpen}
                className="mb-3 me-2"
              >
                <AddIcon
                  sx={{ position: "relative", left: "-6px" }}
                  fontSize="small"
                />{" "}
                Add Row
              </Button>
              <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
              >
                <div>
                  <AddRow refresh={refreshIt} close={handleClose} />
                </div>
              </Modal>
              <Button
                variant="contained"
                onClick={deleteRowFromTable}
                className="mb-3 me-2"
              >
                <DeleteIcon
                  sx={{ position: "relative", left: "-6px" }}
                  fontSize="small"
                />{" "}
                Delete Rows
              </Button>
              <Button
                variant="contained"
                onClick={deleteDuplicateCsv}
                className="mb-3 me-2"
              >
                <DeleteIcon
                  sx={{ position: "relative", left: "-6px" }}
                  fontSize="small"
                />{" "}
                Delete Duplicate Rows
              </Button>
              <Button
                variant="contained"
                onClick={clearAllCaches}
                className="mb-3"
              >
                <SyncIcon
                  sx={{ position: "relative", left: "-6px" }}
                  fontSize="small"
                />{" "}
                Clear Cache
              </Button>
            </div>

            <div className="table-responsive customerTable">
              <DragDropContext onDragEnd={onDragEnd}>
                <table className="table text-start customer-table-css">
                  <thead ref={tableHeaderRef}>
                    <Droppable droppableId="columns" direction="horizontal">
                      {(provided) => (
                        <tr
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          {columns.map((column, index) => (
                            <Draggable
                              key={`row-${index}`}
                              draggableId={column.id}
                              index={index}
                              isDragDisabled={index === 0 || index === 1}
                            >
                              {(provided) => (
                                <th
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="text-center"
                                >
                                  <ResizableBox
                                    width={columnWidths[column.id] || 100}
                                    height={23}
                                    axis="x"
                                    minConstraints={[10, 30]}
                                    maxConstraints={[2000, 23]}
                                    resizeHandles={["e"]}
                                    className="resize-handle"
                                    onResizeStop={(e, data) =>
                                      handleResize(column.id, data.size.width)
                                    }
                                  >
                                    <div
                                      {...(index !== 0 && index !== 1
                                        ? provided.dragHandleProps
                                        : {})}
                                    >
                                      {column.id === "selectAll" ? (
                                        <>
                                          <input
                                            type="checkbox"
                                            checked={selectAll}
                                            onChange={handleSelectAll}
                                          />
                                        </>
                                      ) : (
                                        <div className="d-flex align-items-center gap-2 justify-content-between">
                                          <span
                                            className="truncate-text"
                                            title={column.title}
                                          >
                                            {column.title}
                                          </span>
                                          {column.id !== "serialNumber" && (
                                            <div
                                              className="ml-2 sortable-header"
                                              onClick={() =>
                                                handleSort(column.id)
                                              }
                                            >
                                              <i
                                                className={`fas ${
                                                  sortConfig.key ===
                                                    column.id &&
                                                  sortConfig.direction ===
                                                    "ascending"
                                                    ? "fa-chevron-up"
                                                    : "fa-chevron-down"
                                                }`}
                                              ></i>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </ResizableBox>
                                </th>
                              )}
                            </Draggable>
                          ))}
                          {provided?.placeholder}
                        </tr>
                      )}
                    </Droppable>
                  </thead>
                  <tbody>
                    {filteredResults.length > 0 ? (
                      filteredResults.map((row, rowIndex) => (
                        <tr
                          key={`row-${rowIndex}`}
                          onClick={(e) => {
                            const target = e.target;
                            const isCheckbox =
                              target.tagName.toLowerCase() === "input" &&
                              target.type === "checkbox";
                            if (!isCheckbox) {
                              setRowPopop(row);
                              setModelOpen(true);
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {columns.map((column, index) => {
                            if (column.id === "serialNumber") {
                              return (
                                <td key={`row-${index}`}>
                                  {currentPage * rowsPerPage -
                                    rowsPerPage +
                                    rowIndex +
                                    1}
                                </td>
                              );
                            } else if (column.id === "selectAll") {
                              return (
                                <td key={`row-${index}`}>
                                  <input
                                    type="checkbox"
                                    checked={selectedRows.includes(row._id)}
                                    onChange={() => handleSelectRow(row._id)}
                                  />
                                </td>
                              );
                            } else if (column.id === "year") {
                              return (
                                <td key={`row-${index}`}>
                                  <span>
                                    {row[column.id][0] +
                                      "-" +
                                      row[column.id][row[column.id].length - 1]}
                                  </span>
                                </td>
                              );
                            } else if (column.id === "engineCode") {
                              return (
                                <td key={`row-${index}`}>
                                  <span>{row[column.id].join(", ")}</span>
                                </td>
                              );
                            } else if (column.id === "v8_Transmission_Gears") {
                              return (
                                <td key={`row-${index}`}>
                                  <span>{row[column.id].join(", ")}</span>
                                </td>
                              );
                            } else if (column.id === "startEndDate") {
                              return (
                                <td key={`row-${index}`}>
                                  <span>{row[column.id].join(", ")}</span>
                                </td>
                              );
                            } else {
                              return (
                                <td key={`row-${index}`}>
                                  <span className={column.id}>
                                    {" "}
                                    {column.id === "manufacture"
                                      ? row[column.id].toUpperCase()
                                      : column.id === "model"
                                      ? row[column.id].toUpperCase()
                                      : column.id === "engine"
                                      ? capitalizeWords(row[column.id])
                                      : row[column.id]}{" "}
                                  </span>
                                </td>
                              );
                            }
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="text-center">
                          No results found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </DragDropContext>
            </div>

            {/* pagination */}
            {filteredResults.length > 0 && (
              <nav className="mt-3" style={{ position: "relative" }}>
                <div
                  style={{
                    color: "grey",
                    position: "absolute",
                    top: "50%",
                    right: "8px",
                    transform: "translateY(-50%)",
                  }}
                >
                  {currentPage * rowsPerPage - (rowsPerPage - 1)} -{" "}
                  {currentPage !== totalPages
                    ? currentPage * rowsPerPage
                    : totalRows}{" "}
                  of {totalRows} Items
                </div>
                <ul className="customer-pagination pagination justify-content-center">
                  <li
                    className={`page-item ${
                      currentPage === 1 ? "disabled" : ""
                    }`}
                  >
                    <button className="page-link" onClick={handlePrevPage}>
                      <i className="fa fa-chevron-left"></i>
                    </button>
                  </li>

                  {/* Generate page numbers */}
                  {getPageNumbers().map((pageNumber, index) => (
                    <li
                      key={index}
                      className={`page-item ${
                        pageNumber === currentPage ? "active" : ""
                      } ${pageNumber === "..." ? "disabled" : ""}`}
                    >
                      {pageNumber === "..." ? (
                        <span className="page-link">...</span>
                      ) : (
                        <button
                          className="page-link"
                          onClick={() => {
                            setCurrentPage(pageNumber);
                            window.scrollTo({
                              top: tableHeaderRef.current.offsetTop,
                              behavior: "smooth",
                            });
                          }}
                        >
                          {pageNumber}
                        </button>
                      )}
                    </li>
                  ))}

                  <li
                    className={`page-item ${
                      currentPage === totalPages ? "disabled" : ""
                    }`}
                  >
                    <button className="page-link" onClick={handleNextPage}>
                      <i className="fa fa-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>
      </div>
      <Modal
        open={modelOpen}
        onClose={handleCloseModel}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <div>
          <RowDetails
            data={rowPopop}
            refresh={refreshIt}
            closeModel={handleCloseModel}
          />
        </div>
      </Modal>
    </>
  );
}

import React, { useState } from "react";
import axios from "axios";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import { useProgressToast } from "./customHooks/useProgressToast";
import { Button } from "@mui/material";

const serverUrl = process.env.REACT_APP_SERVER_URL;

function RowDetails({ data, refresh, closeModel }) {
  const { showProgressToast, updateProgress, finalizeToast, setProgress } =
    useProgressToast();

  const initialEditValues = {
    _id: data._id,
    manufacturer: data.manufacturer ? data.manufacturer.trim() : "",
    year: data.year ? `${data.year[0]}-${data.year[data.year.length - 1]}` : '',
    model: data.model ? data.model.trim() : "",
    subModel: data.subModel ? data.subModel.trim() : "",
    engine: data.engine ? data.engine.trim() : "",
    bhp: data.bhp ? data.bhp.trim() : "",
    body: data.body ? data.body.trim() : "",
    startEndDate: data.startEndDate ? data.startEndDate.join(', ') : "",
    engineCode: data.engineCode ? data.engineCode.join(', ') : "",
    v8_Transmission_Gears: data.v8_Transmission_Gears
      ? data.v8_Transmission_Gears.join(', ')
      : "",
    partNo: data.partNo ? data.partNo.trim() : "",
    suspension_A: data.suspension_A ? data.suspension_A.trim() : "",
    transmissionType_A: data.transmissionType_A
      ? data.transmissionType_A.trim()
      : "",
    type_A: data.type_A ? data.type_A.trim() : "",
    vehicleEquipment_A: data.vehicleEquipment_A
      ? data.vehicleEquipment_A.trim()
      : "",
    chassisNumberFrom_A: data.chassisNumberFrom_A
      ? data.chassisNumberFrom_A.trim()
      : "",
  };

  const [isReadOnly, setIsReadOnly] = useState(true);
  const [editableValues, setEditableValues] = useState(initialEditValues);
  const [flyObject, setFlyObject] = useState(initialEditValues);

  console.log(flyObject)

  const editEnquiry = () => {
    setIsReadOnly(false);
  };

  const saveEnquiry = async () => {
    setProgress(0);
    const estimatedSubmitTime = 5000;
    const increment = 100 / (estimatedSubmitTime / 100);
    const toastId = showProgressToast("Updating");
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + increment;
        updateProgress(toastId, newProgress, "Updating");
        if (newProgress >= 100) clearInterval(progressInterval);
        return newProgress < 100 ? newProgress : 100;
      });
    }, 100);

    try {
      await axios.put(`${serverUrl}/api/update-row`, flyObject, {
        headers: { "Content-Type": "application/json" },
      });
      finalizeToast(toastId, true, "Update Successful!");
      setEditableValues(flyObject);
      setIsReadOnly(true);
      refresh();
      closeModel();
    } catch (error) {
      finalizeToast(toastId, false, "", "Update Failed");
      console.error("Error updating:", error);
    } finally {
      clearInterval(progressInterval);
      setProgress(0);
    }
  };

  const deleteRowFromTable = async () => {
    const userResponse = window.confirm("Are you sure you want to delete?");
    if (!userResponse) return;

    setProgress(0);
    const estimatedDeleteTime = 3000;
    const increment = 100 / (estimatedDeleteTime / 100);

    const toastId = showProgressToast("Deleting");
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + increment;
        updateProgress(toastId, newProgress, "Deleting");
        if (newProgress >= 100) clearInterval(progressInterval);
        return newProgress < 100 ? newProgress : 100;
      });
    }, 100);

    try {
      await axios.delete(`${serverUrl}/api/delete-rows`, {
        headers: { "Content-Type": "application/json" },
        data: { ids: [editableValues._id] },
      });
      finalizeToast(toastId, true, "Delete Successful!");
      refresh();
      closeModel();
    } catch (error) {
      finalizeToast(toastId, false, "", "Delete Failed");
      console.error("Error deleting:", error);
    } finally {
      clearInterval(progressInterval);
      setProgress(0);
    }
  };

  const handleChange = (field, value) => {
    setFlyObject((prev) => ({ ...prev, [field]: value }));
  };

  const cancelEdit = () => {
    setFlyObject(initialEditValues);
    setIsReadOnly(true);
  };

  const modelStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 600,
    bgcolor: "background.paper",
    boxShadow: 24,
    p: 4,
  };

  return (
    <>
      <div className="container-fluid customer-details mt-3">
        <div className="mb-3" style={modelStyle}>
          <div className="card">
            <div className="card-body" sx={{ position: "relative" }}>
              <div className="d-flex justify-content-between pb-2">
                <div></div>
                <div>
                  {isReadOnly ? (
                    <EditIcon
                      onClick={editEnquiry}
                      className="me-2"
                      sx={{ cursor: "pointer" }}
                    />
                  ) : (
                    ""
                  )}
                  <DeleteOutlineIcon
                    className="me-2"
                    onClick={deleteRowFromTable}
                    sx={{ cursor: "pointer" }}
                  />
                  <CloseIcon
                    onClick={() => closeModel()}
                    sx={{ cursor: "pointer" }}
                  />
                </div>
              </div>
              <div className="two-column-layout">
                <div className="second-column-box">
                  <div>
                    <div className="label-title">Manufacturer</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) =>
                        handleChange("manufacturer", e.target.value)
                      }
                      readOnly={isReadOnly}
                      value={
                        flyObject.manufacturer ? flyObject.manufacturer : ""
                      }
                    />
                  </div>
                  <div>
                    <div className="label-title">Year</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("year", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.year ? flyObject.year : ""}
                    />
                  </div>
                  <div>
                    <div className="label-title">Model</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("model", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.model ? flyObject.model : ""}
                    />
                  </div>
                  <div>
                    <div className="label-title">Sub Model</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("subModel", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.subModel ? flyObject.subModel : ""}
                    />
                  </div>
                  <div>
                    <div className="label-title">Engine</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("engine", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.engine ? flyObject.engine : ""}
                    />
                  </div>
                  <div>
                    <div className="label-title">BHP</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("bhp", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.bhp ? flyObject.bhp : ""}
                    />
                  </div>
                  <div>
                    <div className="label-title">Body</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("body", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.body ? flyObject.body : ""}
                    />
                  </div>
                  <div>
                    <div className="label-title">StartEnd Date</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) =>
                        handleChange("startEndDate", e.target.value)
                      }
                      readOnly={isReadOnly}
                      value={
                        flyObject.startEndDate
                          ? flyObject.startEndDate
                          : ""
                      }
                    />
                  </div>
                  <div>
                    <div className="label-title">Engine Code</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) =>
                        handleChange("engineCode", e.target.value)
                      }
                      readOnly={isReadOnly}
                      value={
                        flyObject.engineCode
                          ? flyObject.engineCode
                          : ""
                      }
                    />
                  </div>
                  <div>
                    <div className="label-title">V8 Transmission Gears</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("v8_Transmission_Gears", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.v8_Transmission_Gears ? flyObject.v8_Transmission_Gears : ""}
                    />
                  </div>
                  <div>
                    <div className="label-title">Part No</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) =>
                        handleChange("partNo", e.target.value)
                      }
                      readOnly={isReadOnly}
                      value={
                        flyObject.partNo
                          ? flyObject.partNo
                          : ""
                      }
                    />
                  </div>
                  <div>
                    <div className="label-title">Suspension A</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) =>
                        handleChange("suspension_A", e.target.value)
                      }
                      readOnly={isReadOnly}
                      value={
                        flyObject.suspension_A ? flyObject.suspension_A : ""
                      }
                    />
                  </div>
                  <div>
                    <div className="label-title">Transmission Type A</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("transmissionType_A", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.transmissionType_A ? flyObject.transmissionType_A : ""}
                    />
                  </div>
                  <div>
                    <div className="label-title">Type A</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("type_A", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.type_A ? flyObject.type_A : ""}
                    />
                  </div>
                  <div>
                    <div className="label-title">Vehicle Equipment A</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("vehicleEquipment_A", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.vehicleEquipment_A ? flyObject.vehicleEquipment_A : ""}
                    />
                  </div>
                  <div>
                    <div className="label-title">Chassis Number From A</div>
                    <input
                      type="text"
                      className="label-value"
                      onChange={(e) => handleChange("chassisNumberFrom_A", e.target.value)}
                      readOnly={isReadOnly}
                      value={flyObject.chassisNumberFrom_A ? flyObject.chassisNumberFrom_A : ""}
                    />
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-between pt-4">
                {!isReadOnly ? (
                  <div>
                    <utton
                      className="btn btn-outline-secondary me-2 btn-sm"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </utton>
                    <Button
                      className="saveBtn"
                      variant="contained"
                      onClick={saveEnquiry}
                      size="small"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <div style={{ height: "32px" }}></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default RowDetails;

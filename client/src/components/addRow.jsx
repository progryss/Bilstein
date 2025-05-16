import * as React from 'react';
import axios from 'axios';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useProgressToast } from "./customHooks/useProgressToast";
const serverUrl = process.env.REACT_APP_SERVER_URL;

export default function AddRow({ refresh, close }) {

    const { showProgressToast, updateProgress, finalizeToast, setProgress } = useProgressToast();

    const addNewRow = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const payload = Object.fromEntries(formData.entries());

        setProgress(0);
        const estimatedSubmitTime = 5000;
        const increment = 100 / (estimatedSubmitTime / 100);

        const toastId = showProgressToast('Saving');
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                const newProgress = prev + increment;
                updateProgress(toastId, newProgress, 'Saving');
                if (newProgress >= 100) clearInterval(progressInterval);
                return newProgress < 100 ? newProgress : 100;
            });
        }, 100);

        try {
            const response = await axios.post(`${serverUrl}/api/add-row`, payload, {
                headers: { "Content-Type": "application/json" }
            });

            if (response.status === 201) {
                finalizeToast(toastId, true, "Saved Successfully!");
                refresh();
                close();
            }
        } catch (error) {
            finalizeToast(toastId, false, "", "Failed to save");
            console.error('Error submitting form:', error);
        } finally {
            clearInterval(progressInterval);
            setProgress(0);
        }
    };

    const modelStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        bgcolor: 'background.paper',
        boxShadow: 24,
        padding: '45px 16px 16px 16px',
        borderRadius:'6px'
    };

    return (
        <>
            <Box sx={modelStyle}>
                <Box component="form" autoComplete="off" onSubmit={addNewRow}>
                    <CloseIcon onClick={close} sx={{ position: 'absolute', right: '14px', top: '18px', cursor: 'pointer' }} />

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', paddingBottom: '20px',maxHeight:'500px',overflowY:'scroll' }}>
                        <TextField label="Manufacturer" name="manufacturer" size="small" variant="standard" required />
                        <TextField label="Year" name="year" size="small" variant="standard" required placeholder='2001-2003'/>
                        <TextField label="Model" name="model" size="small" variant="standard" required />
                        <TextField label="Sub Model" name="subModel" size="small" variant="standard" required />
                        <TextField label="Engine" name="engine" size="small" variant="standard" required />
                        <TextField label="Bhp" name="bhp" size="small" variant="standard" />
                        <TextField label="Body" name="body" size="small" variant="standard" required/>
                        <TextField label="StartEnd Date" name="startEndDate" size="small" variant="standard" placeholder='value1, value2'/>
                        <TextField label="Engine Code" name="engineCode" size="small" variant="standard" placeholder='value1, value2'/>
                        <TextField label="V8 Transmission Gears" name="v8_Transmission_Gears" size="small" variant="standard" placeholder='value1, value2' />
                        <TextField label="Part No" name="partNo" size="small" variant="standard" required/>
                        <TextField label="Suspension A" name="suspension_A" size="small" variant="standard"/>
                        <TextField label="Transmission Type A" name="transmissionType_A" size="small" variant="standard" />
                        <TextField label="Type A" name="type_A" size="small" variant="standard" />
                        <TextField label="Vehicle Equipment A" name="vehicleEquipment_A" size="small" variant="standard" />
                        <TextField label="Chassis Number From A" name="chassisNumberFrom_A" size="small" variant="standard" />
                    </Box>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        sx={{ float: 'right', mt: 2 }}
                        size='small'
                    >
                        Add Row
                    </Button>
                </Box>
            </Box>
        </>
    );
}

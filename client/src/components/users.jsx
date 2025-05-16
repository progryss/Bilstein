import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddUser from './addUser';
import UserDetails from './userDetails';
import { useProgressToast } from "./customHooks/useProgressToast";

const serverUrl = process.env.REACT_APP_SERVER_URL;

export default function Users() {
    const { showProgressToast, updateProgress, finalizeToast, setProgress } = useProgressToast();

    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${serverUrl}/api/get-users`, {
                withCredentials: true,
                headers: {
                    "Content-Type": "application/json",
                }
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        }
    };

    const handleOpenAdd = () => setOpenAdd(true);
    const handleCloseAdd = () => setOpenAdd(false);
    const handleOpenEdit = (user) => {
        setSelectedUser(user);
        setOpenEdit(true);
    };
    const handleCloseEdit = () => setOpenEdit(false);

    const handleDeleteUser = async (user) => {
        const userResponse = window.confirm('Are you sure you want to delete?');
        if (!userResponse) return;
        const payload = {
            email: user.email
        }
        console.log(payload)
        const toastId = showProgressToast('Deleting User');
        updateProgress(toastId, 'loader', 'Deleting User');
        try {
            const response = await axios.post(`${serverUrl}/api/delete-user`, payload, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            console.log(response)
            finalizeToast(toastId, true, "User Deleted Successfully!");
            fetchUsers()
        } catch (error) {
            console.log('error deleting user', error)
            finalizeToast(toastId, false, "Failed to delete user.");
        }
    }

    return (
        <>
            <Button variant="contained" onClick={handleOpenAdd} className="mt-3 ms-2">Add New User</Button>
            <Modal open={openAdd} onClose={handleCloseAdd}>
                <AddUser close={handleCloseAdd} refresh={fetchUsers} />
            </Modal>

            <TableContainer>
                <Table sx={{ maxWidth: 650 }} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Users</TableCell>
                            <TableCell align="right">Email</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user, index) => (
                            <TableRow key={`${user.id}-${index}`} sx={{height:'53px'}}>
                                <TableCell size='small'>{user.name}</TableCell>
                                <TableCell align="right" size='small' >{user.email}</TableCell>
                                <TableCell align="right" size='small' >
                                    {!user.role && (
                                        <>
                                            <IconButton sx={{ marginRight: "10px" }} onClick={() => handleOpenEdit(user)} >
                                                <EditIcon size='small' />
                                            </IconButton>
                                            <IconButton onClick={() => handleDeleteUser(user)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedUser && (
                <Modal open={openEdit} onClose={handleCloseEdit}>
                    <UserDetails user={selectedUser} close={handleCloseEdit} refresh={fetchUsers} />
                </Modal>
            )}
        </>
    );
}

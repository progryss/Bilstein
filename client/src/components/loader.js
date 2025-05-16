import * as React from 'react';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';

export default function Loader() {
  return (
    <Stack spacing={2} direction="row" alignItems="center" sx={{ marginLeft: '20px' }} className='loader'>
      <CircularProgress size="17px" />
    </Stack>
  );
}

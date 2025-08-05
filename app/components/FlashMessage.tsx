import { Alert, AlertColor, Snackbar } from "@mui/material";
import React from "react";

export const FlashMessage = ({
  severity,
  message,
}: {
  severity: AlertColor;
  message: string;
}) => {
  const [open, setOpen] = React.useState(true);
  const close = () => setOpen(false);

  return (
    <Snackbar
      autoHideDuration={6000}
      open={open}
      onClose={close}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert severity={severity as AlertColor}>{message}</Alert>
    </Snackbar>
  );
};

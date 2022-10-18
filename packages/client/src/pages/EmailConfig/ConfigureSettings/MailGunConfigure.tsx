import React, { useState } from "react";
import { Box, FormControl, Typography } from "@mui/material";
import { GenericButton, Input } from "components/Elements";

export interface IMailGunConfigureForm {
  domain: string;
  smtp: string;
  password: string;
  apiKey: string;
}

const MailGunConfigure = () => {
  const [mailGunConfigForm, setMailGunConfigForm] =
    useState<IMailGunConfigureForm>({
      domain: "",
      smtp: "",
      password: "",
      apiKey: "",
    });

  const handleMailGunConfigFormChange = (e: any) => {
    setMailGunConfigForm({
      ...mailGunConfigForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
  };

  return (
    <Box
      gap={"41px 0px"}
      display="flex"
      flexDirection="column"
      marginTop="26px"
    >
      <FormControl variant="standard">
        <Input
          label="Domain"
          value={mailGunConfigForm.domain}
          placeholder={"Enter your Domain"}
          name="domain"
          id="domain"
          fullWidth
          onChange={handleMailGunConfigFormChange}
        />
      </FormControl>
      <FormControl variant="standard">
        <Input
          label="Default SMTP"
          value={mailGunConfigForm.smtp}
          placeholder={"Enter your Default SMTP"}
          name="smtp"
          id="smtp"
          fullWidth
          onChange={handleMailGunConfigFormChange}
        />
      </FormControl>
      <FormControl variant="standard">
        <Input
          label="Default Password"
          value={mailGunConfigForm.password}
          placeholder={"Enter your Default Password"}
          name="password"
          id="password"
          type="password"
          onChange={handleMailGunConfigFormChange}
        />
      </FormControl>
      <FormControl variant="standard">
        <Input
          label="Private API Key"
          value={mailGunConfigForm.apiKey}
          placeholder={"Enter your Private API Key"}
          name="apiKey"
          id="apiKey"
          type="password"
          onChange={handleMailGunConfigFormChange}
        />
      </FormControl>
      <GenericButton
        onClick={handleSubmit}
        style={{
          maxWidth: "277px",
          "background-image":
            "linear-gradient(to right, #6BCDB5 , #307179, #122F5C)",
          borderRadius: "8px",
        }}
      >
        <Typography variant="h4" color="#FFFFFF">
          Next
        </Typography>
      </GenericButton>
    </Box>
  );
};

export default MailGunConfigure;

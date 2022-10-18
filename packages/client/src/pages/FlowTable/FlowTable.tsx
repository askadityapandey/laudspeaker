import React, { useState } from "react";
import Drawer from "../../components/Drawer";
import Header from "../../components/Header";
import TableTemplate from "../../components/TableTemplate";
import {
  Box,
  FormControl,
  Grid,
  MenuItem,
  Modal,
  Typography,
} from "@mui/material";
import { GenericButton, Select } from "components/Elements";
import { formatDistance } from "date-fns";
import DateRangePicker from "components/DateRangePicker";
import Card from "components/Cards/Card";
import ApiService from "services/api.service";
import { ApiConfig } from "./../../constants";
import NameJourney from "./NameJourney";
import posthog from "posthog-js";

const FlowTable = () => {
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [journeys, setJourneys] = useState<any>([]);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pagesCount, setPagesCount] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [nameModalOpen, setNameModalOpen] = useState<boolean>(false);

  React.useEffect(() => {
    const setLoadingAsync = async () => {
      setLoading(true);
      try {
        const { data } = await ApiService.get({
          url: `${ApiConfig.flow}?take=${itemsPerPage}&skip=${
            itemsPerPage * currentPage
          }`,
        });
        const { data: fetchedJourneys, totalPages } = data;
        setSuccess("Success");
        setPagesCount(totalPages);
        setJourneys(fetchedJourneys);
      } catch (err) {
        posthog.capture("flowTableError", {
          flowTableError: err,
        });
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    setLoadingAsync();
  }, [itemsPerPage, currentPage]);

  const redirectUses = () => {
    setNameModalOpen(true);
  };

  const handleNameSubmit = () => {};

  //getAllJourneysData();

  if (error)
    return (
      <div>
        <p style={{ textAlign: "center" }}>Error</p>
      </div>
    );
  if (loading)
    return (
      <div>
        <p style={{ textAlign: "center" }}>One moment</p>
      </div>
    );
  return (
    <Box
      sx={{
        position: "relative",
        backgroundColor: "#E5E5E5",
        width: "100%",
      }}
    >
      <Header />
      <Box padding={"37px 30px"}>
        {nameModalOpen ? (
          <Modal
            open={nameModalOpen}
            onClose={() => {}}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <>
              <button
                style={{
                  position: "absolute",
                  top: "30px",
                  right: "15px",
                  border: "0px",
                  background: "transparent",
                  outline: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
                onClick={() => setNameModalOpen(false)}
              >
                x
              </button>
              <NameJourney onSubmit={handleNameSubmit} isPrimary={true} />
            </>
          </Modal>
        ) : null}
        <GenericButton
          onClick={redirectUses}
          style={{
            maxWidth: "158px",
            maxHeight: "48px",
            "background-image":
              "linear-gradient(to right, #6BCDB5 , #307179, #122F5C)",
          }}
        >
          Create Journey
        </GenericButton>
        <Card>
          <Grid
            container
            direction={"row"}
            justifyContent={"space-between"}
            alignItems={"center"}
            padding={"20px"}
            borderBottom={"1px solid #D3D3D3"}
            height={"104px"}
          >
            <Typography variant="h3">Active Journeys</Typography>
          </Grid>
          <TableTemplate
            data={journeys}
            pagesCount={pagesCount}
            setCurrentPage={setCurrentPage}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />
        </Card>
      </Box>
    </Box>
  );
};

export default FlowTable;

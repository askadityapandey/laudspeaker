import Progress from "components/Progress";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ApiService from "services/api.service";
import tickIcon from "assets/images/tick.svg";
import { useDebounce } from "react-use";
import AceEditor from "react-ace";
import "ace-builds/webpack-resolver";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-json";
import Input from "components/Elements/Inputv2";
import Table from "components/Tablev2";
import { format } from "date-fns";
import CopyIcon from "assets/icons/CopyIcon";
import Pagination from "components/Pagination";
import SearchIcon from "assets/icons/SearchIcon";
import Select from "components/Elements/Selectv2";

interface PosthogEvent {
  name: string;
  type: string;
  payload: string;
  createdAt: string;
  errorMessage?: string;
}

interface CustomEvent {
  event: string;
  source: string;
  correlationKey: string;
  correlationValue: string;
  payload: string;
  createdAt: string;
  errorMessage?: string;
}

enum ClickhouseKey {
  STEP_ID = "stepId",
  EVENT = "event",
  CREATED_AT = "createdAt",
  EVENT_PROVIDER = "eventProvider",
  TEMPLATE_ID = "templateId",
}

const clickhouseKeys = Object.values(ClickhouseKey);

const MessageTracker = () => {
  const [loading, setLoading] = useState(false);

  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [selectedCustomEvent, setSelectedCustomEvent] = useState<string>("{}");

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagesCount, setPagesCount] = useState(1);

  const [searchKey, setSearchKey] = useState(ClickhouseKey.EVENT);
  const [searchValue, setSearchValue] = useState("");

  const loadData = async () => {
    setSelectedCustomEvent("{}");
    setLoading(true);
    try {
      /*
      const { data } = await ApiService.get({
        url: `/events/posthog-events?take=${itemsPerPage}&skip=${
          itemsPerPage * currentPage
        }&search=${searchName}`,
      });
      const {
        data: fetchedPosthogEvents,
        totalPages,
      }: { data: PosthogEvent[]; totalPages: number } = data;

      */

      const { data } = await ApiService.get({
        url: `/events/message-events?take=${itemsPerPage}&skip=${
          itemsPerPage * (currentPage - 1)
        }&searchKey=${searchKey}&searchValue=${searchValue}`,
      });
      const {
        data: fetchedCustomEvents,
        totalPages,
      }: { data: CustomEvent[]; totalPages: number } = data;
      setPagesCount(totalPages);
      setCustomEvents(fetchedCustomEvents);
    } catch (err) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemsPerPage, currentPage]);

  useDebounce(
    () => {
      loadData();
    },
    800,
    [searchKey, searchKey, searchValue]
  );

  const handleSelectCustomEvent = (customEvent: string) => {
    setSelectedCustomEvent(customEvent);
  };

  if (loading) return <Progress />;

  return (
    <div className="p-5 flex flex-col gap-6 font-inter font-normal text-[14px] text-[#111827] leading-[22px]">
      <div className="text-black text-[20px] font-semibold leading-[28px]">
        Message Tracker
      </div>
      <div className="bg-white rounded-lg flex">
        <div className="w-full p-5 border-r border-[#F3F4F6] flex flex-col gap-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Select
                value={searchKey}
                options={clickhouseKeys.map((key) => ({
                  key: key,
                  title: key,
                }))}
                onChange={(value) => setSearchKey(value)}
                placeholder="Search key"
                className="!w-full !pl-[38px]"
              />
              <div className="absolute top-1/2 -translate-y-1/2 left-[12px]">
                <SearchIcon />
              </div>
            </div>
            <div className="relative">
              <Input
                value={searchValue}
                onChange={(value) => setSearchValue(value)}
                placeholder="Search value"
                wrapperClassName="!w-[200px]"
                className="!w-full"
              />
              {/* <div className="absolute top-1/2 -translate-y-1/2 left-[12px]">
                <SearchIcon />
              </div> */}
            </div>
          </div>

          <div className="relative rounded w-full overflow-hidden border-x border-t border-[#E5E7EB]">
            <Table
              headings={[
                <div className="px-5 h-[44px] flex items-center">Message</div>,
                <div className="px-5 h-[44px] flex items-center"></div>,
                <div className="px-5 h-[44px] flex items-center">
                  Last update
                </div>,
              ]}
              //rowsData={posthogEvents}
              //rows={posthogEvents.map((posthogEvent) => [
              rowsData={customEvents}
              rows={customEvents.map((customEvent) => [
                <div
                  className="flex items-center h-[56px]"
                  //onClick={() => handleSelectPosthogEvent(posthogEvent)}
                  onClick={() =>
                    handleSelectCustomEvent(JSON.stringify(customEvent))
                  }
                >
                  {customEvent.event}
                </div>,
                <div
                  className="flex items-center h-[56px] text-[#F43F5E]"
                  //onClick={() => handleSelectPosthogEvent(posthogEvent)}
                  onClick={() =>
                    handleSelectCustomEvent(JSON.stringify(customEvent))
                  }
                >
                  {customEvent.errorMessage}
                </div>,
                <div
                  className="flex items-center h-[56px]"
                  //onClick={() => handleSelectPosthogEvent(posthogEvent)}
                  onClick={() =>
                    handleSelectCustomEvent(JSON.stringify(customEvent))
                  }
                >
                  {format(new Date(customEvent.createdAt), "MM/dd/yyyy HH:mm")}
                </div>,
              ])}
              className="w-full"
              headClassName="bg-[#F3F4F6]"
              //selectedRow={
              //  selectedPosthogEvent
              //    ? posthogEvents.indexOf(selectedPosthogEvent)
              //    : -1
              //}
              selectedRow={
                selectedCustomEvent
                  ? customEvents.indexOf(JSON.parse(selectedCustomEvent))
                  : -1
              }
              //onRowClick={(i) => setSelectedPosthogEvent(posthogEvents[i])}
              onRowClick={(i) => {
                setSelectedCustomEvent(JSON.stringify(customEvents[i]));
              }}
            />
          </div>

          {pagesCount > 1 && (
            <Pagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={pagesCount}
            />
          )}
        </div>
        <div className="w-full p-5">
          <div className="border border-[#E5E7EB] rounded overflow-hidden mt-[52px]">
            <div className="px-5 h-[44px] flex justify-between items-center bg-[#F3F4F6] border-b border-[#E5E7EB]">
              <div className="font-semibold">Payload</div>
              <div
                className="cursor-pointer"
                onClick={() => {
                  ///if (!selectedPosthogEvent?.payload) return;
                  if (!JSON.parse(selectedCustomEvent)?.payload) return;

                  //navigator.clipboard.writeText(selectedPosthogEvent.payload);
                  navigator.clipboard.writeText(
                    JSON.parse(selectedCustomEvent).payload
                  );
                }}
              >
                <CopyIcon />
              </div>
            </div>
            <AceEditor
              aria-label="editor"
              mode="json"
              theme="github"
              name="editor"
              fontSize={12}
              minLines={15}
              maxLines={40}
              width="100%"
              showPrintMargin={false}
              showGutter
              editorProps={{ $blockScrolling: true }}
              setOptions={{
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
              }}
              //value={selectedPosthogEvent?.payload}
              value={JSON.stringify(JSON.parse(selectedCustomEvent), null, 2)}
              onChange={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageTracker;

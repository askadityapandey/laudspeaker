import TagsInput from "react-tagsinput";
import CloseIcon from "@heroicons/react/20/solid/XMarkIcon";
import "./EventListComponent.css";
import { useEffect, useRef, useState } from "react";
import { useClickAway } from "react-use";

import {
  TagComponentBase,
  TagComponentChildProps
} from "../common/TagComponentBase";

interface EventListComponentProps extends TagComponentChildProps {
}

export default function EventListComponent(props: EventListComponentProps) {
  return TagComponentBase({
    ...props,
    inputPlaceholder: "Add events you wish to track",
    noMatchingMessage: "Press enter to add event",
    serverListEmptyMessage: "Press enter to add event"
  });
}

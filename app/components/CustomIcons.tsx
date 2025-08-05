import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";
import React from "react";

type VariantNames = "main" | "white";
type IconVariantProps = {
  variant?: VariantNames;
};
type VariantDescription = {
  upper: string;
  lower: string;
};

const variants: Record<VariantNames, VariantDescription> = {
  main: {
    upper: "#FF5500",
    lower: "#FFAF8A",
  },
  white: {
    upper: "white",
    lower: "white",
  },
};

const CustomIcon: React.FC<SvgIconProps & IconVariantProps> = ({
  variant = "main",
  ...props
}) => (
  <SvgIcon {...props}>
    <svg
      height="512px"
      width="512px"
      version="1.1"
      viewBox="0 0 512 512"
      xmlSpace="preserve"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <g>
        <g>
          <polygon
            points="226.172,26.001 90.149,288.345 170.29,288.345 226.172,184.036 281.605,288.345     361.116,288.345   "
            style={{ fill: variants[variant].upper }}
          />
          <polygon
            points="361.116,288.345 321.675,367.586 281.605,288.345 220.871,288.345 321.675,485.999     421.851,288.345   "
            style={{ fill: variants[variant].lower }}
          />
        </g>
      </g>
    </svg>
  </SvgIcon>
);

export default CustomIcon;
export const StravaIcon = CustomIcon;

import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import DownhillSkiingIcon from "@mui/icons-material/DownhillSkiing";
import PoolIcon from "@mui/icons-material/Pool";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import HikingIcon from "@mui/icons-material/Hiking";
import KayakingIcon from "@mui/icons-material/Kayaking";
import { Avatar } from "@mui/material";
import type { SportType } from "strava";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { AvatarProps } from "@mui/material/Avatar";

interface ActivityTypeIconProps {
  sportType: SportType | string;
  iconProps?: SvgIconProps;
  avatarProps?: AvatarProps;
}

/**
 * Returns an Avatar with the appropriate icon for a given Strava activity/sport type
 */
export function ActivityTypeIcon({ sportType, iconProps, avatarProps }: ActivityTypeIconProps) {
  const getIcon = () => {
    switch (sportType) {
      // Running activities
      case "Run":
      case "TrailRun":
      case "Treadmill":
        return <DirectionsRunIcon {...iconProps} />;
      
      // Cycling activities
      case "Ride":
      case "MountainBikeRide":
      case "GravelRide":
      case "EBikeRide":
      case "EMountainBikeRide":
      case "Velomobile":
      case "VirtualRide":
        return <DirectionsBikeIcon {...iconProps} />;
      
      // Hiking/Walking
      case "Hike":
      case "Walk":
        return <HikingIcon {...iconProps} />;
      
      // Swimming
      case "Swim":
      case "VirtualSwim":
        return <PoolIcon {...iconProps} />;
      
      // Winter sports
      case "AlpineSki":
      case "BackcountrySki":
      case "NordicSki":
      case "Snowboard":
      case "Snowshoe":
        return <DownhillSkiingIcon {...iconProps} />;
      
      // Water sports
      case "Canoeing":
      case "Kayaking":
      case "Kitesurf":
      case "Rowing":
      case "StandUpPaddling":
      case "Surfing":
      case "Windsurf":
        return <KayakingIcon {...iconProps} />;
      
      // Gym/Indoor activities
      case "WeightTraining":
      case "Workout":
      case "Crossfit":
      case "StairStepper":
      case "Elliptical":
        return <FitnessCenterIcon {...iconProps} />;
      
      // Default fallback for unknown activity types
      default:
        return <QuestionMarkIcon {...iconProps} />;
    }
  };

  return (
    <Avatar {...avatarProps}>
      {getIcon()}
    </Avatar>
  );
}
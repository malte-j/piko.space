import { motion } from "framer-motion";
import s from "./PillMenu.module.scss";

export function PillMenu<T extends string>({
  activeTab,
  setActiveTab,
  rightAlignLastTab = true,
  tabs,
}: {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  rightAlignLastTab?: boolean;
  tabs: {
    label?: string;
    value: T;
    icon: React.ReactNode;
  }[];
}) {
  return (
    <div className={s.fileListMenu}>
      {tabs.map((tab, i) => (
        <button
          key={tab.value}
          data-active={activeTab === tab.value}
          onClick={() => setActiveTab(tab.value)}
          style={
            rightAlignLastTab && i == tabs.length - 1
              ? { marginLeft: "auto" }
              : undefined
          }
        >
          {tab.icon}
          {tab.label && <span>{tab.label}</span>}
          {activeTab === tab.value && (
            <motion.div
              layoutId="navBackground"
              className={s.navBackground}
              transition={{
                ease: "easeOut",
                type: "tween",
                duration: 0.2,
              }}
            >
              {" "}
            </motion.div>
          )}
        </button>
      ))}
    </div>
  );
}

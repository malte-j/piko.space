import s from "./Checkbox.module.scss";

interface CheckboxProps {
  value: boolean;
  onChange: (value: boolean) => void;
  children?: React.ReactNode;
  // label?: string;
}

export const Checkbox = ({ value, onChange, children }: CheckboxProps) => {
  return (
    <label className={s.checkbox} data-checked={value}>
      <div className={s.check}>
        <div className={s.circle}></div>
      </div>
      <input
        type="checkbox"
        value={value ? "true" : "false"}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
};

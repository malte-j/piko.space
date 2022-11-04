import { nanoid } from "nanoid";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../state/UserProvider";
import s from "./index.module.scss";

export default function Index() {
  const { user } = useUser();
  let navigate = useNavigate();

  useEffect(() => {
    if (!user?.isAnonymous) {
      navigate("/edit/" + nanoid(11), { replace: true });
    }
  }, [user]);

  return (
    <div className={s.wrapper}>
    </div>
  );
}

import FocusedDialog from "./FocusedDialog";
import type {OperationFeedback} from "./ActionProgress";
export default function CommandProgressDialog(props:OperationFeedback){
 if(!props.pending&&!props.uncertain)return null;
 return <FocusedDialog title={props.operation} busy onClose={()=>{}} progress={props}/>;
}

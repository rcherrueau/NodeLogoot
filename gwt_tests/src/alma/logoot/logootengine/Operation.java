package alma.logoot.logootengine;

/**
 * An operation consist in adding or removing a caractere.
 * 
 * @author R5A
 * 
 */
public class Operation implements IOperation {

	private static final long serialVersionUID = 1L;
	private Character content = null;
	private String type;

	/**
	 * The position of the caractere.
	 */
	private LogootIdContainer position;

	public Operation() {
	}

	public Operation(String type, LogootIdContainer position) {
		this.type = type;
		this.position = position;
	}

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}

	public void setContent(Character content) {
		this.content = content;
	}

	public void setPosition(LogootIdContainer position) {
		this.position = position;
	}

	public Operation(String type, LogootIdContainer position, Character content) {
		this.type = type;
		this.position = position;
		this.content = content;
	}

	@Override
	public boolean isIns() {
		return this.type.equals("insert");
	}

	@Override
	public boolean isDel() {
		return this.type.equals("delete");
	}

	/**
	 * @return the position of the caractere to delete or to add.
	 */
	public LogootIdContainer getPosition() {
		return position;
	}

	public Character getContent() {
		return content;
	}

	public String toString() {
		return "[" + type + " : " + content + "," + position + "]";
	}
}

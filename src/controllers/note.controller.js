/* eslint-disable no-shadow */
const { error, success } = require("../utils");
const config = require("../config/note.config.json");
const { addNoteValidation } = require("../validations");
const { noteService } = require("../services");

const addOne = async (req, res, next) => {
  const reqBody = req.body;
  try {
    const validatedReqData = await addNoteValidation.validateAsync(reqBody);
    const { name, description } = validatedReqData;
    const note = await noteService.addOne({
      account_id: req.account.id,
      name,
      description,
    });
    return success.handler({ note }, req, res, next);
  } catch (err) {
    switch (err.name) {
      case "SequelizeUniqueConstraintError":
        err.custom_key = "NoteConflict";
        err.message = `Note with name ${req.body.name} already exists`;
        break;
      default:
        break;
    }
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  addOne,
};

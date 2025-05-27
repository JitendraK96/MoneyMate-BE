const { error } = require("../utils");
const { Op } = require("sequelize");
const { STATUS } = require("../consts");
const { sequelizeManager } = require("../managers");

const { NoteModel } = sequelizeManager;

const getListCount = async ({ account_id, status, search, ids }) => {
  const where = {
    account_id,
  };

  if (status) {
    where.status = status;
  }

  if (ids) {
    where.id = ids;
  }

  if (search) {
    where.name = {
      [Op.like]: `%${search}%`,
    };
  }

  return NoteModel.count({
    where,
  });
};

const getList = async ({
  account_id,
  page_no,
  page_size,
  status,
  sort_by,
  sort_order,
  search,
  ids,
}) => {
  const limit = page_size;
  const offset = (page_no - 1) * limit;

  const where = {
    account_id,
  };

  if (ids) {
    where.id = ids;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.name = {
      [Op.like]: `%${search}%`,
    };
  }

  const order = [];
  order.push([sort_by, sort_order]);

  return NoteModel.findAll({
    where,
    order,
    offset,
    limit,
  });
};

const getOne = async ({ account_id, id }) => {
  const where = {
    account_id,
    id,
  };

  const item = await NoteModel.findOne({
    where,
  });

  if (!item) {
    return error.throwNotFound({ custom_key: "NoteNotFound", item: "Note" });
  }

  return item;
};

const addOne = async ({ account_id, name, description }) =>
  NoteModel.create({
    account_id,
    name,
    description,
  });

const enableOne = async ({ id, account_id }) => {
  const item = await getOne({
    id,
    account_id,
  });

  if (item.status !== STATUS.DISABLED) {
    throw error.throwPreconditionFailed({
      message: "Only disabled note can be enabled",
    });
  }

  item.status = STATUS.ENABLED;
  item.version += 1;
  return item.save();
};

const disableOne = async ({ id, account_id }) => {
  const item = await getOne({
    id,
    account_id,
  });

  if (item.status !== STATUS.ENABLED) {
    throw error.throwPreconditionFailed({
      message: "Only enabled note can be disabled",
    });
  }

  item.status = STATUS.DISABLED;
  item.version += 1;
  return item.save();
};

const deleteAllNotes = async ({ account_id }) => {
  await NoteModel.destroy({
    where: {
      account_id,
    },
  });
  return getList({
    account_id,
    page_no: 1,
    page_size: 100,
    sort_by: "created_at",
    sort_order: "desc",
  });
};

const deleteNotes = async ({ account_id, ids }) =>
  NoteModel.destroy({
    where: {
      account_id,
      id: ids,
    },
  });

const updateNotes = async ({ account_id, notes }) => {
  notes.forEach((note) => {
    // eslint-disable-next-line no-param-reassign
    note.account_id = account_id;
  });
  await NoteModel.bulkCreate(notes, {
    updateOnDuplicate: ["description"],
  });

  return getList({
    account_id,
    page_no: 1,
    page_size: 100,
    sort_by: "created_at",
    sort_order: "desc",
  });
};

const deleteOne = async ({ account_id, id, force_update }) => {
  const item = await getOne({
    account_id,
    id,
  });

  if (force_update) {
    return item.destroy();
  }

  return item.destroy();
};

const copyNote = async ({ account_id, id }) => {
  const note = await getOne({ account_id, id });
  const copyName = await suggestCopyName({ account_id, id, name: note.name });
  const copiedNote = await addOne({
    account_id,
    name: copyName,
    description: note.description,
  });

  return copiedNote;
};

module.exports = {
  getListCount,
  getList,
  getOne,
  addOne,
  enableOne,
  disableOne,
  updateNotes,
  deleteOne,
  deleteAllNotes,
  deleteNotes,
  copyNote,
};

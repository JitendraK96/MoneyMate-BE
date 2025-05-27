/* eslint-disable no-shadow */
const { error, success } = require("../utils");
const { analyzeStatementValidation } = require("../validations");
const { analyzeService } = require("../services");

const analyzeStatement = async (req, res, next) => {
  const reqBody = req.body;
  try {
    const validatedReqData = await analyzeStatementValidation.validateAsync(
      reqBody
    );
    const { prompt, imageType, base64Data } = validatedReqData;
    const analyzedStatment = await analyzeService.analyzeStatement({
      prompt,
      imageType,
      base64Data,
    });
    return success.handler({ analyzedStatment }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  analyzeStatement,
};

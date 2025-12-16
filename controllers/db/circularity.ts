import { Circularity } from '../../models/';

const getCircularityMetrics = async () => {
  return await Circularity.find();
};

export default { getCircularityMetrics };

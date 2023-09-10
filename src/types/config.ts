import {z} from 'zod';

const configSchema = z.object({
    SurveyID: z.string(),
    GamePath: z.string(),
    PostSurveyID: z.string(),
    PlayerID: z.string(),
    TestID: z.string(),
});

type config = z.infer<typeof configSchema>;
export {config, configSchema}
  
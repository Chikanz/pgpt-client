import {z} from 'zod';

const configSchema = z.object({
    TestID: z.string(),
    PlayerID: z.string(),
    PreSurveyID: z.string(),
    PostSurveyID: z.string(),
    RootURL: z.string(),
    GamePath: z.string().optional(),
});

type config = z.infer<typeof configSchema>;
export {config, configSchema}
  
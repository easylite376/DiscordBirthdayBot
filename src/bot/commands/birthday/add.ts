import { Command } from "discord-akairo";
import { Message } from "discord.js";
import { Guid } from "guid-typescript";
import moment from "moment";
import Container, { Service } from "typedi";
import { Config } from "../../../core/config/config";
import { Constants } from "../../../core/constants";
import { User } from "../../../core/lib/domain/users/models/user";
import { UserManager } from "../../../core/lib/domain/users/usecases/userManager";
import { UserManagerImpl } from "../../../core/lib/domain/users/usecases/userManagerImpl";
import { BirthdayEntry } from "../../../features/saveBirthday/domain/models/birthdayEntry";
import { BirthdayEntryManager } from "../../../features/saveBirthday/domain/usecases/birthdayEntryManager";
import { BirthdayEntryManagerImpl } from "../../../features/saveBirthday/domain/usecases/birthdayEntryManagerImpl";

@Service()
export default class AddBirthdayCommand extends Command {
    userManager: UserManager;

    birthdayManager: BirthdayEntryManager;

    constructor() {
        super("add", {
            aliases: ["add"],
            args: [
                {
                    id: "username",
                    type: "string",
                },
                {
                    id: "date",
                    type: (_: Message, date: string): moment.Moment => moment(date, Constants.DATE_FORMAT, true),
                    // fix problem with date format. It is english format for now, but should be a german one, because used by germans. Maybe make configurable later
                },
            ],
            channel: "guild",
        });

        this.userManager = Container.get(UserManagerImpl);
        this.birthdayManager = Container.get(BirthdayEntryManagerImpl);
    }

    async exec(message: Message, args: any): Promise<Message | Message[]> {
        if (!args.username || !args.date) {
            return message.reply(
                `You have to use the command correctly: ${Config.PREFIX}add <username> <date in format:  ${Constants.DATE_FORMAT}>`,
            );
        }
        var dateAsMoment = args.date as moment.Moment;

        if (!dateAsMoment || !dateAsMoment.isValid())
            return message.reply("The date was not in the correct format. Please use DD.MM.YYYY");

        const userId: string = message.author.id;
        const name: string = args.username;
        const birthday = dateAsMoment.toDate();

        if (await this.birthdayManager.exists(name, birthday, userId))
            return message.reply("The birthday already exists for you.");

        let user = await this.userManager.getUserById(userId);

        if (!user) {
            user = new User({ id: userId });
            await this.userManager.save(user);
        }

        const birthdayEntry = new BirthdayEntry(Guid.create().toString(), args.username, dateAsMoment.toDate(), userId);

        await this.birthdayManager.save(birthdayEntry);
        return message.reply(`Saved successfully.`);
    }
}

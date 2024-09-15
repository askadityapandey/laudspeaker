import { Module } from '@nestjs/common';
import { MailgunProvider } from './email/providers/mailgun.provider';

function getImportsList() {
  let importList: Array<any> = [];

  return importList;
}
function getProvidersList() {
  let providerList: Array<any> = [MailgunProvider];

  return providerList;
}

function getControllersList() {
  let controllerList: Array<any> = [];

  return controllerList;
}

function getExportsList() {
  let exportList: Array<any> = [MailgunProvider];

  return exportList;
}

@Module({
  imports: getImportsList(),
  providers: getProvidersList(),
  controllers: getControllersList(),
  exports: getExportsList(),
})
export class ChannelsModule { }

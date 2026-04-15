char reportLine[160];
char workA[128];
char workB[128];
char fileBuf[128];
char secretBuf[32];
char sprite8[8]={0x81,0x42,0x24,0x18,0x18,0x24,0x42,0x81};
char snap8[8];
char paletteData[]={
    0,0,255,0,
    0,255,0,0,
    255,0,0,0
};
int ints[8];

int plus1(int x)
{
    return x+1;
}

void main()
{
    int a,b,c,d,i,key1,key2,key3,hold,ms,year;
    int *ip;
    char fp;
    char dh;
    char *name;
    char timeBuf[8];

    MakeDir("/LavaData");
    fp=fopen("/LavaData/vm_report.txt","w+");
    if (fp==0)
        exit(1);

    strcpy(reportLine,"START");
    fwrite(reportLine,1,strlen(reportLine),fp);
    putc('\n',fp);

    a=100;
    b=25;
    c=a+b;
    c=c-(b/5);
    c=c*2;
    c=c/5;
    c=c%11;
    d=(a&b)|(a^b);
    ints[0]=a<<2;
    ints[1]=a>>2;
    ints[2]=~b;
    ints[3]=-a;
    ip=&a;
    *ip=*ip+3;
    a++;
    ++b;
    a--;
    --b;
    d=plus1(d);
    if ((a>b && b<30) || !(a==b))
        d=d+10;
    switch (c) {
    case 4:
        d=d+1;
        break;
    case 5:
        d=d+2;
        break;
    default:
        d=d+3;
    }
    sprintf(reportLine,"AR:%d:%d:%d:%d:%d:%d:%d",a,b,c,d,ints[0],ints[1],ints[2]);
    fwrite(reportLine,1,strlen(reportLine),fp);
    putc('\n',fp);

    strcpy(workA,"Alpha");
    strcpy(workB,"Beta");
    strcat(workA,workB);
    memset(fileBuf,'x',5);
    fileBuf[5]=0;
    memcpy(fileBuf+5,workA,strlen(workA)+1);
    memmove(fileBuf+2,fileBuf,4);
    strcpy(secretBuf,"Secret!");
    Secret(secretBuf,strlen(secretBuf),"LavaX");
    Secret(secretBuf,strlen(secretBuf),"LavaX");
    sprintf(reportLine,"STR:%s:%d:%c:%c:%d:%c",workA,strlen(workA),tolower('Q'),toupper('q'),strcmp(workA,"AlphaBeta"),*strchr(workA,'B'));
    fwrite(reportLine,1,strlen(reportLine),fp);
    putc('\n',fp);
    fwrite(secretBuf,1,strlen(secretBuf),fp);
    putc('\n',fp);

    ChDir("/LavaData");
    fp=fopen("/LavaData/vm_report.txt","a+");
    strcpy(fileBuf,"FileData");
    d=fopen("data.bin","w+");
    fwrite(fileBuf,1,strlen(fileBuf),d);
    putc('!',d);
    rewind(d);
    memset(fileBuf,0,32);
    a=fread(fileBuf,1,9,d);
    sprintf(reportLine,"FILE:%s:%d:%d:%d",fileBuf,a,ftell(d),feof(d));
    fwrite(reportLine,1,strlen(reportLine),fp);
    putc('\n',fp);
    rewind(d);
    sprintf(reportLine,"FILEC:%c",getc(d));
    fwrite(reportLine,1,strlen(reportLine),fp);
    putc('\n',fp);
    fclose(d);
    d=fopen("trash.tmp","w");
    fclose(d);
    sprintf(reportLine,"DEL:%d",DeleteFile("/LavaData/trash.tmp"));
    fwrite(reportLine,1,strlen(reportLine),fp);
    putc('\n',fp);
    dh=opendir("/LavaData");
    name=readdir(dh);
    if (name) {
        sprintf(reportLine,"DIR:%s",name);
        fwrite(reportLine,1,strlen(reportLine),fp);
        putc('\n',fp);
    }
    rewinddir(dh);
    name=readdir(dh);
    if (name) {
        sprintf(reportLine,"DIR2:%s",name);
        fwrite(reportLine,1,strlen(reportLine),fp);
        putc('\n',fp);
    }
    closedir(dh);

    SetScreen(0);
    ClearScreen();
    Point(1,1,1);
    Line(0,0,20,10,1);
    Rectangle(2,2,12,8,1);
    Box(14,2,24,10,0,1);
    Box(26,2,34,10,1,1);
    Circle(18,18,6,0,1);
    Ellipse(36,18,10,6,0,1);
    Block(40,2,46,8,0x41);
    WriteBlock(50,2,8,8,1,sprite8);
    GetBlock(48,0,8,8,0x40,snap8);
    FillArea(3,3,1);
    XDraw(4);
    Refresh();
    SetGraphMode(4);
    SetBgColor(2);
    SetFgColor(14);
    TextOut(0,0,"C4",0x41);
    Refresh();
    SetGraphMode(8);
    SetPalette(205,3,paletteData);
    SetBgColor(7);
    SetFgColor(205);
    TextOut(0,0,"C8",0x41);
    Refresh();
    SetGraphMode(1);
    fp=fopen("/LavaData/vm_report.txt","a+");
    sprintf(reportLine,"GRAPH:%d",snap8[0]);
    fwrite(reportLine,1,strlen(reportLine),fp);
    putc('\n',fp);

    Delay(1);
    ms=Getms();
    GetTime(timeBuf);
    year=((int)timeBuf[0]&255)|(((int)timeBuf[1]&255)<<8);
    key1=getchar();
    key2=Inkey();
    key3=GetWord(0);
    hold=CheckKey(128);
    ReleaseKey(128);
    fp=fopen("/LavaData/vm_report.txt","a+");
    sprintf(reportLine,"IN:%d:%d:%d:%d:%d:%d",key1,key2,key3,hold,year,ms);
    fwrite(reportLine,1,strlen(reportLine),fp);
    putc('\n',fp);

    srand(1);
    a=rand();
    b=rand();
    c=Sin(90);
    d=Cos(180);
    fp=fopen("/LavaData/vm_report.txt","a+");
    sprintf(reportLine,"MATH:%d:%d:%d:%d:%d",a,b,c,d,abs(-42));
    fwrite(reportLine,1,strlen(reportLine),fp);
    putc('\n',fp);

    strcpy(reportLine,"DONE");
    fp=fopen("/LavaData/vm_report.txt","a+");
    fwrite(reportLine,1,strlen(reportLine),fp);
    putc('\n',fp);
    fclose(fp);
    exit(0);
}

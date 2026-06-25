namespace BaseCore.Entities
{
    public class BusImage
    {
        public int ImageID { get; set; }
        public int BusID { get; set; }
        public string ImageURL { get; set; } = string.Empty;
        public bool IsAvatar { get; set; } = false;
        public int SortOrder { get; set; } = 0;
        public DateTime? UploadedAt { get; set; }

        public Bus? Bus { get; set; }
    }
}
